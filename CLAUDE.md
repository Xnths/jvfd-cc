# jvfd-cc

Landing page and blog for João Vitor Fernandes, psychologist (Vila Madalena, São Paulo). Next.js (App Router) + Go services (`backend/`: auth server with Google-only login, content/admin API) + PostgreSQL. Payload/Mongo survive only for the service pages (treatments) until they move to Go; everything else (posts, comments, leads, subscribers, contatos, media) lives in Postgres. Site: https://psicologojoaofernandes.com

## Go platform (current state)

- **Admin UI:** `/admin` (Next.js, `src/app/(admin)`, screens in `src/admin/`): Painel, Posts (Lexical editor in `src/editor/`), Leads, Comentários, Assinantes, Contatos (clinical only), Mídia. Browser talks to the Go API at `/api/v1/admin/*` through nginx; login is Google OAuth only (`/auth/google/login`), allowlist in `.env` `ADMIN_EMAILS`/`ADMIN_ROLES` (João=clinical, Jonathas=tech).
- **Old Payload admin** is at `/payload-admin` (fallback; read-only for everything already moved to Postgres when `CONTENT_SOURCE=api`). Service pages (`treatments`) are still edited there until they are migrated (pages/services/settings editors are not built yet).
- **Release:** `bash deploy/deploy.sh` on the Pi (see below). `scripts/deploy.sh` is the old Payload-only script; don't use it.
- **Data import from Mongo:** export with `docker exec clinic-mongo mongoexport --db payload-joao --collection <c> --jsonArray > <dir>/<c>.json`, then `docker compose -f deploy/compose.yml --env-file .env --profile tools run --rm -v <dir>:/export:ro migrate payload-import /export [--apply] [--refresh-content]` and `verify-import`. Leads/subscribers/comments/contatos are insert-only; posts/media only update with `--refresh-content`.
- **nginx config gotcha:** `deploy/nginx/conf.d/clinic.conf` is a single-file bind mount; after a `git pull` changes it, run `docker restart clinic-nginx` (a reload keeps the old inode).
- Tests: `cd backend && TEST_DATABASE_URL=postgres://… go test -p 1 ./...` (the tests DROP SCHEMA public: use a throwaway database).
- Comments need Cloudflare Turnstile keys (`TURNSTILE_SITE_KEY` at build, `TURNSTILE_SECRET` runtime); without them the form shows "temporariamente fechados".

## Deployment (legacy notes below; the new flow is `deploy/deploy.sh`)

**There is no automatic deploy.** Pushing to `main` does not release anything: the GitHub workflow `.github/workflows/deploy.yml` goes through Cloudflare Access and does not work. Production is released by hand on the Raspberry Pi.

- Host: Raspberry Pi (`raspberrypi`, aarch64), user `xnths`, key-based SSH from the dev machine.
- Address: **`192.168.68.110`** (confirmed by the owner; `192.168.1.110` is wrong). Connect with `ssh xnths@192.168.68.110`. Only reachable from the home LAN (or via Tailscale).
- Project directory on the Pi: `/var/www/jvfd-cc`
- Steps:
  1. Push to `main` first (the Pi runs `git pull origin main`).
  2. `ssh xnths@192.168.68.110`, then `cd /var/www/jvfd-cc && bash scripts/deploy.sh`
  3. For a long build, run it detached and read the log: `nohup bash scripts/deploy.sh > /tmp/deploy.log 2>&1 &`
- `scripts/deploy.sh` does a blue/green deploy: pulls, builds the `clinic-frontend:<color>` image, health-checks it, switches nginx (`nginx/conf.d/<color>.conf` copied to `default.conf`), then stops the old color. Needs `.env` on the Pi (`DATABASE_URI`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_GA_ID`).
- The Pi's working tree has local changes to `docker-compose/docker-compose.prod.yml` and `nginx/conf.d/default.conf`. Leave them; `git pull` works as long as upstream doesn't touch those files.
- Containers: `clinic-frontend-blue|green`, `clinic-nginx`, `clinic-mongo`. The `blog-*` containers on the same Pi are a different project; don't touch them.
- The root disk is small (29 GB). It was 82% full before the 2026-10-24 deploy and 54% after (`docker system prune -f` runs at the end). Check `df -h /` before big builds.
- No passwordless `sudo` on the Pi. Everything above works as the `xnths` user (member of the `docker` group).
- **Pi DNS problem (seen 2026-10-24).** The Pi runs Cloudflare WARP and `/etc/resolv.conf` points at its local resolver (127.0.2.x). That resolver got stuck and returned no answers, so `git pull` ("Could not resolve host: github.com") and Docker builds failed. Check with `getent hosts github.com`. Fix without sudo: `warp-cli disconnect; sleep 4; warp-cli connect` (wait about 15 s). Run it detached (`nohup sh -c "..." &`) so an SSH drop can't leave WARP disconnected. The router (192.168.68.1) resolves DNS fine; public resolvers (1.1.1.1, 8.8.8.8) are blocked from the Pi.
- Even when DNS works, lookups inside Docker build containers drop out now and then (`EAI_AGAIN`); `pnpm install` retries on its own and finishes. Fonts are self-hosted (`src/assets/fonts`, `next/font/local`) so the build never fetches from Google. Don't switch back to `next/font/google`. If a build fails on a network step, just re-run `scripts/deploy.sh`: a failed build never touches the running site.
- Stop-gap if only `git` can't resolve: `git config http.curloptResolve github.com:443:140.82.112.3` in the Pi's repo (remove it afterwards with `--unset`).
- Verify a deploy: `curl -sI https://psicologojoaofernandes.com/` plus `/llms.txt`, `/sitemap.xml` and `/aulas-particulares`; `docker ps` should show one `clinic-frontend-<color>`.

## Content updates (CMS)

The service pages (psicoterapia, plantão, terapia de casal, ...) are stored in MongoDB through Payload. New copy is in `scripts/content/treatments.ts`. Dry run: `npx payload run scripts/update-treatments.ts`. Apply (writes a backup to `backups/` first): add `--apply`. Needs `DATABASE_URI` and `PAYLOAD_SECRET`.

## Dev

- Dev stack: `./docker-up.sh dev` from `docker-compose/`.
- `pnpm build` must succeed **without** `DATABASE_URI`: the Docker build has no database, so database-backed pages render on demand (ISR) and `generateStaticParams` returns `[]` when `DATABASE_URI` is unset.
- Public CMS reads go through `src/lib/queries.ts` (tag-cached). Payload hooks in `src/hooks/revalidate.ts` clear the cache when content is saved, so don't query Payload directly from public pages.
- Clinic facts (address, CRP, hours, services, FAQ, links) live in `src/content/clinic.ts`; tutoring in `src/content/tutoring.ts`. JSON-LD, `llms.txt`, markdown exports and the footer all read from them.
- Analytics contract: keep the `schedule_click` event and its `source` values, the `/api/leads` GCLID beacon, and the section anchors (`#services`, `#about`, `#faq`, `#contact`); the ad campaigns depend on them.
- Copy rules (CFP Res. 010/2005): no promised results, no superiority claims, no prices in promotional text, show CRP 06/157908.
