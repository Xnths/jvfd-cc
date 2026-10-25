#!/bin/bash
# Post-deploy checks through the real entry point (nginx), from the Docker network.
set -uo pipefail
base="${SMOKE_BASE:-http://clinic-nginx}"
fail=0
check() { # name path expected-status
    local code; code=$(docker run --rm --network cloudflare-net curlimages/curl -s -o /dev/null -w '%{http_code}' -H 'Host: psicologojoaofernandes.com' "$base$2")
    if [ "$code" = "$3" ]; then echo "ok   $1 ($code)"; else echo "FAIL $1: got $code, want $3"; fail=1; fi
}
check "home"                 /                              200
check "blog"                 /blog                          200
check "sitemap"              /sitemap.xml                   200
check "auth health"          /auth/denied                   403
check "jwks"                 /.well-known/jwks.json         200
check "internal jobs hidden" /api/v1/internal/jobs/x        404
check "token hidden"         /auth/token                    404
check "revalidate hidden"    /internal/revalidate           404
check "admin needs login"    /admin                         307
exit $fail
