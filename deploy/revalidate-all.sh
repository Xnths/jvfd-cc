#!/bin/bash
# Asks the live Next.js colour (through the internal nginx server) to drop all page caches.
set -euo pipefail
: "${REVALIDATE_SECRET:?}"
ts=$(date +%s)
body='{"all":true}'
sig=$(printf '%s.%s' "$ts" "$body" | openssl dgst -sha256 -hmac "$REVALIDATE_SECRET" -hex | awk '{print $NF}')
docker run --rm --network clinic-internal curlimages/curl -s -f -X POST "http://clinic-nginx:8081/internal/revalidate" \
    -H "Content-Type: application/json" -H "X-Timestamp: $ts" -H "X-Signature: sha256=$sig" -d "$body"
