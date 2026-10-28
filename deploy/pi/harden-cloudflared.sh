#!/bin/bash
# Run on the Pi as root:  sudo bash deploy/pi/harden-cloudflared.sh
# - moves the tunnel token out of the process list (/etc/cloudflared/tunnel.env, mode 600)
# - Restart=always for cloudflared
# - watchdog timer: restarts cloudflared when its edge connections are not ready for 3 minutes
# Idempotent. Rollback: delete /etc/systemd/system/cloudflared.service.d and the watchdog units.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "run with sudo"; exit 1; }

unit=/etc/systemd/system/cloudflared.service
token=$(grep -oE -- '--token [^ ]+' "$unit" | awk '{print $2}' || true)
if [ -z "$token" ] && [ -f /etc/cloudflared/tunnel.env ]; then
    echo "token already in tunnel.env"
elif [ -z "$token" ]; then
    echo "ERROR: no --token in $unit and no tunnel.env"; exit 1
else
    umask 077
    printf 'TUNNEL_TOKEN=%s\n' "$token" > /etc/cloudflared/tunnel.env
    echo "token saved to /etc/cloudflared/tunnel.env"
fi
chmod 600 /etc/cloudflared/tunnel.env

mkdir -p /etc/systemd/system/cloudflared.service.d
cat > /etc/systemd/system/cloudflared.service.d/override.conf <<'CONF'
[Service]
EnvironmentFile=/etc/cloudflared/tunnel.env
ExecStart=
ExecStart=/usr/local/bin/cloudflared --no-autoupdate --metrics 127.0.0.1:20241 --protocol http2 tunnel run
Restart=always
RestartSec=5
CONF

cat > /usr/local/bin/cloudflared-watchdog.sh <<'CONF'
#!/bin/bash
# Restart cloudflared when /ready fails 3 times in a row (one check per minute).
f=/run/cloudflared-watchdog.fails
if curl -sf -m 5 http://127.0.0.1:20241/ready >/dev/null; then rm -f "$f"; exit 0; fi
n=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$f"
echo "cloudflared not ready ($n/3)"
if [ "$n" -ge 3 ]; then
    echo "restarting cloudflared"; rm -f "$f"
    systemctl restart cloudflared
fi
CONF
chmod 755 /usr/local/bin/cloudflared-watchdog.sh

cat > /etc/systemd/system/cloudflared-watchdog.service <<'CONF'
[Unit]
Description=Restart cloudflared when the tunnel is not ready

[Service]
Type=oneshot
ExecStart=/usr/local/bin/cloudflared-watchdog.sh
CONF
cat > /etc/systemd/system/cloudflared-watchdog.timer <<'CONF'
[Unit]
Description=cloudflared tunnel watchdog

[Timer]
OnBootSec=3min
OnUnitActiveSec=1min

[Install]
WantedBy=timers.target
CONF

systemctl daemon-reload
systemctl enable --now cloudflared-watchdog.timer
systemctl restart cloudflared
sleep 8
curl -s http://127.0.0.1:20241/ready; echo
ps aux | grep '[c]loudflared --no-autoupdate' | grep -c -- '--token' | sed 's/^0$/token no longer in ps: ok/'
