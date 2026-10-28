# edge-host (Raspberry Pi 5) — home server

Self-hosted server for Jonathas's personal site/blog and João Fernandes's psychology clinic site.
Everything public goes through a **Cloudflare Tunnel**: no router port is forwarded, no public IP is needed.

| | |
|---|---|
| Hardware | Raspberry Pi 5 (aarch64, 8 GB RAM, 29 GB SD card — keep `df -h /` under ~80%) |
| OS | Debian 13 (trixie), user `xnths` (in `docker` and `sudo` groups) |
| LAN address | `192.168.68.110` (wired `eth0`; reserve it on the router) |
| Remote access | `ssh xnths@192.168.68.110` on the home LAN. Tailscale is installed but logged out. |
| Cloudflare WARP | **Uninstalled on purpose** (2026-10-28, package purged). It sat underneath the tunnel and caused the 530 outages. Do not enable it. |

## How a request flows

```
visitor ─▶ Cloudflare edge ─▶ Worker "clinic-edge" (only psicologojoaofernandes.com)
                                   │ origin error/timeout → serves saved snapshot
                                   ▼
                          Cloudflare Tunnel (cloudflared, systemd, 4 connections)
                                   ▼
        Pi: hostname → local port (set in the Cloudflare dashboard, see below)
          psicologojoaofernandes.com → :82  clinic-nginx  → Next.js (blue/green) + Go API/auth + Postgres
          xnths.com                  → :81  blog-nginx    → blog-payload (Next/Payload) + Mongo
          dev.xnths.com              → :80  (nothing listening right now)
```

## The tunnel

- One tunnel (`560303f8-…`), **remotely managed**: the hostname → service table lives in the Cloudflare dashboard
  (Zero Trust → Networks → Tunnels → this tunnel → Public hostnames). The `config.yml` files on disk are not used.
- Runs as systemd unit `cloudflared` (`/usr/local/bin/cloudflared … --protocol http2 tunnel run`),
  token in `/etc/cloudflared/tunnel.env` (root-only, never paste it anywhere).
- Local health: `curl localhost:20241/ready` → `{"status":200,"readyConnections":4}`; metrics at `localhost:20241/metrics`.
- Watchdog: `cloudflared-watchdog.timer` checks `/ready` every minute and restarts the tunnel after 3 failures.
  Logs: `journalctl -u cloudflared-watchdog` (needs sudo / `adm` group).
- Setup script (idempotent): `/var/www/jvfd-cc/deploy/pi/harden-cloudflared.sh`.

## Add a new project (new site on a new hostname)

1. **Run it in Docker, bound to a free host port** (80/81/82 are taken; use e.g. 83, 84…).
   Prefer binding to the LAN/localhost only; the tunnel reaches it at `http://localhost:<port>`.
   ```yaml
   # /var/www/<project>/docker-compose.yml
   services:
     app:
       build: .
       restart: always
       ports: ["83:3000"]
   ```
   Use its own compose project/network. **Do not touch the `blog-*` or `clinic-*` containers or the
   `cloudflare-net` network** from another project.
2. **Test locally on the Pi:** `curl -I http://localhost:83`.
3. **Publish the hostname:** Cloudflare dashboard → Zero Trust → Networks → Tunnels → (tunnel) → Public hostnames →
   *Add*: hostname `app.example.com`, service `HTTP` → `localhost:83`. Cloudflare creates the DNS record
   automatically when the domain is on the same Cloudflare account. No restart of cloudflared is needed.
   (Use `localhost`, not the Pi's DHCP address.)
4. **Check:** `curl -I https://app.example.com`.
5. Add the site to UptimeRobot, and note it in the table above.

Optional protection: put the hostname behind Cloudflare Access (Zero Trust → Access) for private tools
(admin panels, Airflow, dev sites). Airflow here is deliberately not published: `127.0.0.1:8088` only.

## Existing projects

### psicologojoaofernandes.com — `/var/www/jvfd-cc` (git: Xnths/jvfd-cc, branch `main`)
- Next.js + Go services + PostgreSQL + Airflow. Full notes: `/var/www/jvfd-cc/CLAUDE.md`.
- Release by hand (nothing is automatic): push to `main`, then
  `cd /var/www/jvfd-cc && bash deploy/deploy.sh` (blue/green, health-checked; use `nohup … > /tmp/deploy.log &` for long builds).
- Containers: `clinic-frontend-blue|green`, `clinic-api`, `clinic-auth`, `clinic-nginx` (:82), `clinic-postgres`,
  `clinic-airflow-*`, `clinic-mongo` (frozen archive of the old CMS — remove only with the owner's OK).
- Backups: `~/backups/clinic-*.dump` (pg_dump before each deploy, last 7 kept) plus the nightly Airflow backup.
- **Edge Worker `clinic-edge`** (code in `deploy/edge-worker/`, deployed with wrangler from the dev machine): keeps a snapshot of the
  ad landing pages in Cloudflare KV and serves it if the Pi/tunnel fails (header `x-edge-fallback: snapshot`);
  queues `POST /api/leads` while the origin is down and replays it. `https://psicologojoaofernandes.com/?edge=origin`
  bypasses it (use that URL for "is the Pi really up" monitoring).

### xnths.com — `/var/www/blog`
- Next.js + Payload CMS + Mongo (`blog-payload-green`, `blog-db`, `blog-nginx` on :81). Own compose project `blog`.

## Daily checks

```bash
uptime; free -h; df -h /            # load, RAM, disk
docker ps                           # all containers Up
curl -s localhost:20241/ready       # tunnel: 4 connections
ss -tn | grep 7844                  # tunnel sockets must use 192.168.68.110, not 172.16.x
getent hosts github.com             # DNS works
```

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Public 530 / "Origin DNS error" | Tunnel not connected: `curl localhost:20241/ready`; `sudo systemctl restart cloudflared`. The watchdog does this after ~3 min. |
| Public 502 | Tunnel is up but the container behind the port is down/restarting: `docker ps`, `docker logs <name>`; test `curl -I localhost:82`. Also happens for seconds during deploys. |
| `Could not resolve host` on the Pi | `cat /etc/resolv.conf` must list `192.168.15.1`/`192.168.68.1` (NetworkManager). If it points at 127.0.2.x, WARP came back: `sudo systemctl disable --now warp-svc`. |
| Site fine for you, down for others | Check `https://…/?edge=origin` vs plain URL: plain URL may be served by the Worker snapshot while the Pi is down. |
| Containers fail with `EAI_AGAIN` (admin "Servidor indisponível", analytics errors) after any change to the Pi's DNS/VPN | Docker fixes each container's upstream DNS at start. `docker restart` the affected containers (clinic-auth, clinic-api, clinic-frontend-*, airflow, blog-payload-*). |
| Disk > 85% | `docker system prune -f`, `docker builder prune -af`, trim `~/backups`. |
| nginx config changed after `git pull` | Single-file bind mount: `docker restart clinic-nginx` (reload keeps the old inode). |

## Rules of the house

- No automatic deploys; the GitHub deploy workflow does not work (Cloudflare Access).
- Never run WARP/other VPN clients on this box without excluding the tunnel traffic.
- Never commit or paste secrets (`.env`, `/etc/cloudflared/tunnel.env`, `secrets/`).
- Keep this file updated when adding a project or changing a port.
