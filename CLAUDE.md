# jvfd-cc

Landing page and blog for João Vitor Fernandes, psychologist (Vila Madalena, São Paulo). Next.js (App Router) + Payload CMS + MongoDB. Site: https://psicologojoaofernandes.com

## Deployment

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
- The root disk is small (about 5 GB free, 29 GB total). `docker system prune -f` runs at the end of the deploy; check `df -h /` before big builds.
- Known issue (2026-10-24): the Pi's `/etc/resolv.conf` points at Cloudflare WARP's local resolver (127.0.2.x). WARP reports "Connected" but DNS lookups hung, so `git pull` failed with "Could not resolve host: github.com". If a deploy fails at the pull step, check DNS on the Pi first (`getent hosts github.com`).

## Content updates (CMS)

The service pages (psicoterapia, plantão, terapia de casal, ...) are stored in MongoDB through Payload. New copy is in `scripts/content/treatments.ts`. Dry run: `npx payload run scripts/update-treatments.ts`. Apply (writes a backup to `backups/` first): add `--apply`. Needs `DATABASE_URI` and `PAYLOAD_SECRET`.

## Dev

- Dev stack: `./docker-up.sh dev` from `docker-compose/`.
- `pnpm build` must succeed **without** `DATABASE_URI`: the Docker build has no database, so database-backed pages render on demand (ISR) and `generateStaticParams` returns `[]` when `DATABASE_URI` is unset.
- Public CMS reads go through `src/lib/queries.ts` (tag-cached). Payload hooks in `src/hooks/revalidate.ts` clear the cache when content is saved, so don't query Payload directly from public pages.
- Clinic facts (address, CRP, hours, services, FAQ, links) live in `src/content/clinic.ts`; tutoring in `src/content/tutoring.ts`. JSON-LD, `llms.txt`, markdown exports and the footer all read from them.
- Analytics contract: keep the `schedule_click` event and its `source` values, the `/api/leads` GCLID beacon, and the section anchors (`#services`, `#about`, `#faq`, `#contact`); the ad campaigns depend on them.
- Copy rules (CFP Res. 010/2005): no promised results, no superiority claims, no prices in promotional text, show CRP 06/157908.
