# jvfd-cc

Landing page and blog for João Vitor Fernandes, psychologist (Vila Madalena, São Paulo). Next.js (App Router) + Go services (`backend/`: auth server with Google-only login, content/admin API) + PostgreSQL. Payload was removed: everything (posts, comments, leads, subscribers, contatos, media, service pages, editable texts) lives in Postgres. Site: https://psicologojoaofernandes.com

## Go platform (current state)

- **Editing happens on the real site.** Admins (Google login, `/auth/google/login`) get a bar on top of every page ("Editar página"); in edit mode every text is a dashed box (`<Editable k="home.hero.title">default</Editable>`, `src/edit/`): click, edit, Salvar/Cancelar, goes live at once with history ("Histórico", "Padrão" restores the code default) and the CFP copy lint (422 → "Salvar mesmo assim"). Copy lives in `site_texts` (Go: `backend/internal/api/admin_texts.go`, `PUT /api/v1/admin/texts/{key}` with `If-Match`); the default stays in code, so with no overrides the page is identical. **Never rename an `Editable` key** (it is the database key). Lists use per-item keys (`home.faq.<id>.question`).
- **Posts are written on the post page** (`+ Novo post` in the bar → `/edit/enter?return=/blog/<slug>` → draft at its real URL; `src/edit/PostInlineEditor.tsx`). **Service pages** are Postgres `pages`+`services` rows (`+ Novo serviço`, `Configurar serviço`, body edited in place by `ServiceBodyEditor`); layout/theme enums map to classes in `src/lib/service-themes.ts`. Legal pages are editable through `LegalBody`/`LegalEditor` (Lexical doc stored under `legal.privacidade` / `legal.termos`; code JSX is the default).
- **`/admin`** (Next.js, `src/app/(admin)`, screens in `src/admin/`) is only for data tables: Painel, Posts list, Leads, Comentários, Assinantes, Contatos (clinical only), Mídia. Roles: João=clinical, Jonathas=tech (allowlist in `.env` `ADMIN_EMAILS`/`ADMIN_ROLES`).
- **Release:** `bash deploy/deploy.sh` on the Pi (see below). Nothing is automatic.
- **Cache:** the Go API calls `POST /internal/revalidate` (HMAC, via the internal nginx server) with tags (`texts`, `posts`, `services`, `pages`, `comments`); `texts` also refreshes the whole layout. Without `API_INTERNAL_URL` (Docker build, plain `pnpm build`) the site renders the copy in code.
- **Data import from the old Mongo (archive only now):** export with `docker exec clinic-mongo mongoexport --db payload-joao --collection <c> --jsonArray > <dir>/<c>.json` (chmod the dir 755, files 644), then `docker compose -f deploy/compose.yml --env-file .env --profile tools run --rm -v <dir>:/export:ro migrate payload-import /export [--apply] [--refresh-content]` and `verify-import`. Insert-only for interactions; posts/media/services only update with `--refresh-content`. The `clinic-mongo` container still runs as a frozen archive; remove it (and its volume) only after the user confirms.
- **nginx config gotcha:** `deploy/nginx/conf.d/clinic.conf` is a single-file bind mount; after a `git pull` changes it, run `docker restart clinic-nginx` (a reload keeps the old inode).
- **Redirects behind nginx:** the Next container sees itself as `0.0.0.0:3000`, so route handlers must redirect with a relative `Location` (see `src/app/edit/enter/route.ts`).
- Tests: `cd backend && TEST_DATABASE_URL=postgres://… go test -p 1 ./...` (the tests DROP SCHEMA public: use a throwaway database).
- Comments need Cloudflare Turnstile keys (`TURNSTILE_SITE_KEY` at build, `TURNSTILE_SECRET` runtime); without them the form shows "temporariamente fechados".

## Deployment

**There is no automatic deploy.** Pushing to `main` does not release anything: the GitHub workflow `.github/workflows/deploy.yml` goes through Cloudflare Access and does not work. Production is released by hand on the Raspberry Pi.

- Host: Raspberry Pi (`raspberrypi`, aarch64), user `xnths`, key-based SSH from the dev machine.
- Address: **`192.168.68.110`** (confirmed by the owner; `192.168.1.110` is wrong). Connect with `ssh xnths@192.168.68.110`. Only reachable from the home LAN (or via Tailscale).
- Project directory on the Pi: `/var/www/jvfd-cc`
- Steps:
  1. Push to `main` first (the Pi runs `git pull origin main`).
  2. `ssh xnths@192.168.68.110`, then `cd /var/www/jvfd-cc && bash deploy/deploy.sh`
  3. For a long build, run it detached and read the log: `nohup bash deploy/deploy.sh > /tmp/deploy.log 2>&1 &`
- `deploy/deploy.sh` (the only deploy script; `scripts/deploy.sh` and `docker-compose/`, `nginx/` are the old Payload-era files, kept only because the Pi has local edits on them) pulls, builds the Go images, runs migrations, builds the `clinic-frontend:<color>` image, health-checks it, switches the upstream, revalidates everything and runs `deploy/smoke.sh`. Needs `.env` on the Pi (see `.env.example`).
- The Pi's working tree has local changes to `docker-compose/docker-compose.prod.yml` and `nginx/conf.d/default.conf`. Leave them; `git pull` works as long as upstream doesn't touch those files.
- Containers: `clinic-frontend-blue|green`, `clinic-nginx`, `clinic-mongo`. The `blog-*` containers on the same Pi are a different project; don't touch them.
- The root disk is small (29 GB). It was 82% full before the 2026-10-24 deploy and 54% after (`docker system prune -f` runs at the end). Check `df -h /` before big builds.
- No passwordless `sudo` on the Pi. Everything above works as the `xnths` user (member of the `docker` group).
- **Pi DNS problem (seen 2026-10-24).** The Pi runs Cloudflare WARP and `/etc/resolv.conf` points at its local resolver (127.0.2.x). That resolver got stuck and returned no answers, so `git pull` ("Could not resolve host: github.com") and Docker builds failed. Check with `getent hosts github.com`. Fix without sudo: `warp-cli disconnect; sleep 4; warp-cli connect` (wait about 15 s). Run it detached (`nohup sh -c "..." &`) so an SSH drop can't leave WARP disconnected. The router (192.168.68.1) resolves DNS fine; public resolvers (1.1.1.1, 8.8.8.8) are blocked from the Pi.
- Even when DNS works, lookups inside Docker build containers drop out now and then (`EAI_AGAIN`); `pnpm install` retries on its own and finishes. Fonts are self-hosted (`src/assets/fonts`, `next/font/local`) so the build never fetches from Google. Don't switch back to `next/font/google`. If a build fails on a network step, just re-run `deploy/deploy.sh`: a failed build never touches the running site.
- Stop-gap if only `git` can't resolve: `git config http.curloptResolve github.com:443:140.82.112.3` in the Pi's repo (remove it afterwards with `--unset`).
- Verify a deploy: `curl -sI https://psicologojoaofernandes.com/` plus `/llms.txt`, `/sitemap.xml` and `/aulas-particulares`; `docker ps` should show one `clinic-frontend-<color>`.

## Dev

- Dev stack: `./docker-up.sh dev` from `docker-compose/`.
- `pnpm build` must succeed **without** the API: the Docker build has no API, so API-backed pages render on demand (ISR) and `generateStaticParams` returns `[]` when `API_INTERNAL_URL` is unset.
- Public reads go through `src/lib/queries.ts` and `src/lib/texts.ts` (tag-cached); the Go API invalidates them on save.
- Clinic facts (address, CRP, hours, services, FAQ, links) live in `src/content/clinic.ts`; tutoring in `src/content/tutoring.ts`. JSON-LD, `llms.txt`, markdown exports and the footer all read from them.
- Analytics contract: keep the `schedule_click` event and its `source` values, the `/api/leads` GCLID beacon, and the section anchors (`#services`, `#about`, `#faq`, `#contact`); the ad campaigns depend on them.
- Copy rules (CFP Res. 010/2005): no promised results, no superiority claims, no prices in promotional text, show CRP 06/157908.
