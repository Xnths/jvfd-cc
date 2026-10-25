#!/bin/bash
# Release script for the Raspberry Pi. Run on the Pi:  cd /var/www/jvfd-cc && bash deploy/deploy.sh
#
# Everything lives inside main() and is only invoked on the last line, so a `git pull` that
# replaces this very file while it is running cannot make bash execute a half-new script.
set -euo pipefail

main() {
    local root; root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    cd "$root"
    git config --global --add safe.directory "$root" >/dev/null 2>&1 || true

    local compose=(docker compose -f deploy/compose.yml --env-file .env)
    local net_public="cloudflare-net" net_internal="clinic-internal"
    local min_free_gb="${MIN_FREE_GB:-3}"

    [ -f .env ] || { echo "ERROR: .env not found"; exit 1; }
    set -a; source .env; set +a
    [ -f secrets/jwt.pem ] || { echo "ERROR: secrets/jwt.pem missing (migrate keys generate secrets/jwt.pem)"; exit 1; }
    docker network inspect "$net_public" >/dev/null 2>&1 || { echo "ERROR: network $net_public not found"; exit 1; }

    # --- 1. preflight: the SD card is small ---
    local free_gb; free_gb=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
    echo "Free disk: ${free_gb} GB (minimum ${min_free_gb} GB)"
    if [ "$free_gb" -lt "$min_free_gb" ]; then
        echo "ERROR: not enough free disk. Try: docker builder prune -af"; exit 1
    fi

    # --- 2. code ---
    echo "Pulling..."
    git pull --ff-only origin "${DEPLOY_BRANCH:-main}"

    # --- 3. Go services + database ---
    mkdir -p deploy/nginx/active
    # Once content lives in Postgres, the old /api/{leads,subscribe,unsubscribe} URLs are served by Go.
    if [ "${CONTENT_SOURCE:-payload}" = api ]; then
        cp deploy/nginx/legacy-api.cutover.conf deploy/nginx/active/legacy-api.conf
    else
        : > deploy/nginx/active/legacy-api.conf
    fi

    echo "Starting postgres..."
    "${compose[@]}" up -d postgres
    "${compose[@]}" build auth migrate

    echo "Backing up database before migrating..."
    mkdir -p "$HOME/backups"
    docker exec clinic-postgres pg_dump -U clinic -Fc clinic > "$HOME/backups/clinic-$(date +%Y%m%d-%H%M%S).dump"
    ls -1t "$HOME"/backups/clinic-*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f

    echo "Applying migrations..."
    "${compose[@]}" --profile tools run --rm migrate up

    "${compose[@]}" up -d auth
    if grep -q '^  api:' deploy/compose.yml; then
        "${compose[@]}" build api && "${compose[@]}" up -d api
    fi

    # --- 4. Next.js blue/green ---
    local active new
    if docker ps --format '{{.Names}}' | grep -q '^clinic-frontend-blue$'; then active=blue; new=green; else active=green; new=blue; fi
    echo "Active: $active -> deploying: $new"

    docker build \
        --build-arg NEXT_PUBLIC_GA_ID="${NEXT_PUBLIC_GA_ID:-}" \
        --build-arg NEXT_PUBLIC_POSTHOG_TOKEN="${NEXT_PUBLIC_POSTHOG_TOKEN:-}" \
        --build-arg NEXT_PUBLIC_POSTHOG_HOST="${NEXT_PUBLIC_POSTHOG_HOST:-}" \
        --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="${TURNSTILE_SITE_KEY:-}" \
        -t "clinic-frontend:$new" -f Dockerfile .

    docker rm -f "clinic-frontend-$new" >/dev/null 2>&1 || true
    docker run -d --name "clinic-frontend-$new" --network "$net_public" --restart always \
        -e NODE_ENV=production -e NEXT_TELEMETRY_DISABLED=1 -e HOSTNAME=0.0.0.0 \
        -e DATABASE_URI="${DATABASE_URI:-}" -e PAYLOAD_SECRET="${PAYLOAD_SECRET:-}" \
        -e NEXT_PUBLIC_GA_ID="${NEXT_PUBLIC_GA_ID:-}" \
        -e NEXT_PUBLIC_POSTHOG_TOKEN="${NEXT_PUBLIC_POSTHOG_TOKEN:-}" -e NEXT_PUBLIC_POSTHOG_HOST="${NEXT_PUBLIC_POSTHOG_HOST:-}" \
        -e RESEND_API_KEY="${RESEND_API_KEY:-}" \
        -e CONTENT_SOURCE="${CONTENT_SOURCE:-payload}" \
        -e API_INTERNAL_URL="${API_INTERNAL_URL:-}" -e AUTH_INTERNAL_URL="${AUTH_INTERNAL_URL:-}" \
        -e REVALIDATE_SECRET="${REVALIDATE_SECRET:-}" \
        -e JWT_ISSUER="${JWT_ISSUER:-}" -e JWT_AUDIENCE="${JWT_AUDIENCE:-}" \
        -v jvfd-cc_media-data:/app/media \
        "clinic-frontend:$new" >/dev/null
    docker network connect "$net_internal" "clinic-frontend-$new" 2>/dev/null || true

    echo "Health check..."
    local ok=false i
    for i in $(seq 1 15); do
        if docker run --rm --network "$net_public" curlimages/curl -s -f "http://clinic-frontend-$new:3000${HEALTH_PATH:-/}" >/dev/null; then ok=true; break; fi
        echo "  waiting ($i/15)"; sleep 3
    done
    if [ "$ok" != true ]; then
        echo "ERROR: $new failed its health check. Logs:"; docker logs "clinic-frontend-$new" 2>&1 | tail -n 30
        docker rm -f "clinic-frontend-$new" >/dev/null
        exit 1
    fi

    # --- 5. switch nginx ---
    printf 'set $frontend http://clinic-frontend-%s:3000;\n' "$new" > deploy/nginx/active/frontend.conf
    if docker inspect clinic-nginx >/dev/null 2>&1 && [ "$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' clinic-nginx)" != "clinic" ]; then
        # One-time hand-over from the old compose project's nginx (a few seconds of downtime).
        echo "Replacing legacy clinic-nginx container..."
        docker rm -f clinic-nginx >/dev/null
    fi
    if docker ps --format '{{.Names}}' | grep -q '^clinic-nginx$'; then
        docker exec clinic-nginx nginx -t && docker exec clinic-nginx nginx -s reload
    else
        "${compose[@]}" up -d nginx
    fi
    echo "Traffic switched to $new"
    sleep 3
    if ! docker run --rm --network "$net_public" curlimages/curl -s -f -o /dev/null -H 'Host: psicologojoaofernandes.com' "http://clinic-nginx/"; then
        echo "ERROR: site not reachable through nginx after the switch; restoring $active"
        if docker inspect "clinic-frontend-$active" >/dev/null 2>&1; then
            printf 'set $frontend http://clinic-frontend-%s:3000;\n' "$active" > deploy/nginx/active/frontend.conf
            docker exec clinic-nginx nginx -s reload
        fi
        exit 1
    fi

    # Each colour has its own Next.js cache: refresh the new one so edits made during the
    # build are not shown stale. (Route exists once the Go-backed content phase ships.)
    if [ -n "${REVALIDATE_SECRET:-}" ]; then
        bash "$root/deploy/revalidate-all.sh" || echo "  (revalidate-all skipped)"
    fi

    # --- 6. cleanup (targeted: this host also runs other projects) ---
    docker stop "clinic-frontend-$active" >/dev/null 2>&1 || true
    docker rm "clinic-frontend-$active" >/dev/null 2>&1 || true
    docker image prune -f --filter "until=24h" >/dev/null
    docker builder prune -f --filter "until=24h" >/dev/null

    bash "$root/deploy/smoke.sh" || { echo "WARNING: smoke test failed"; exit 1; }
    echo "Deployment finished."
}

main "$@"
