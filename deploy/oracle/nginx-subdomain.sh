#!/usr/bin/env bash
# Deutsch Mastery — serve the app on your own (sub)domain through the server's existing nginx, with a free
# Let's Encrypt certificate. Adds ONE new nginx file for this domain; other sites on the server are not touched.
#
#   sudo DOMAIN=deutsch.lavo.uz EMAIL=siz@example.com bash ~/deutsch-mastery/deploy/oracle/nginx-subdomain.sh
#
# Before: a DNS A record DOMAIN -> this server's IP, and the app running (setup.sh). NO_CERT=1 skips certbot.
set -euo pipefail

DOMAIN="${DOMAIN:?DOMAIN kerak, masalan DOMAIN=deutsch.lavo.uz}"
APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
NO_CERT="${NO_CERT:-0}"

die() { printf '\n\033[1;31mXato: %s\033[0m\n' "$*" >&2; exit 1; }
log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" = 0 ] || die "sudo bilan yurgizing"
[[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || die "domen noto'g'ri: $DOMAIN (kichik harflarda yozing)"
command -v nginx >/dev/null || die "nginx topilmadi"
[ -f "$APP_DIR/.env" ] || die "$APP_DIR/.env yo'q — avval setup.sh ni yurgizing"

port="$(grep -oP '^FRONTEND_HOST_PORT=\K[0-9]+' "$APP_DIR/.env" || echo 8080)"
curl -fsS "http://127.0.0.1:${port}/api/health" >/dev/null || die "ilova 127.0.0.1:${port} da javob bermayapti (docker compose ps)"

# Ubuntu's nginx reads sites-enabled; the nginx.org package reads conf.d. Use whichever this server includes.
if grep -rqs "sites-enabled" /etc/nginx/nginx.conf; then
  conf="/etc/nginx/sites-available/${DOMAIN}"; link="/etc/nginx/sites-enabled/${DOMAIN}"
else
  conf="/etc/nginx/conf.d/${DOMAIN}.conf"; link=""
fi
grep -rlqs --exclude="$(basename "$conf")" "server_name[^;]*\b${DOMAIN//./\\.}\b" /etc/nginx/ \
  && die "${DOMAIN} allaqachon boshqa nginx faylida bor — o'sha faylni tekshiring"

log "nginx sozlamasi: $conf  (-> 127.0.0.1:${port})"
backup=""
[ -f "$conf" ] && backup="$(mktemp)" && cp "$conf" "$backup"
cat > "$conf" <<NGINX
# Deutsch Mastery (${DOMAIN}) -> docker compose frontend on 127.0.0.1:${port}. Written by deploy/oracle/nginx-subdomain.sh
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        # overwrite with the real client: the app's nginx trusts this hop and rate-limits per client IP
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
    }
}
NGINX
[ -n "$link" ] && ln -sf "$conf" "$link"

if ! nginx -t 2>/tmp/nginx-test.log; then
  cat /tmp/nginx-test.log
  if [ -n "$backup" ]; then cp "$backup" "$conf"; else rm -f "$conf" ${link:+"$link"}; fi
  die "nginx -t o'tmadi — o'zgarish qaytarildi, boshqa saytlar ta'sirlanmadi"
fi
systemctl reload nginx
sleep 2  # reload is graceful: old workers answer for a moment
echo "HTTP tayyor: http://${DOMAIN}"

if [ "$NO_CERT" = 1 ]; then exit 0; fi

log "HTTPS sertifikati (Let's Encrypt)"
if ! command -v certbot >/dev/null; then
  apt-get update -y && apt-get install -y certbot python3-certbot-nginx
fi
email_args=(--register-unsafely-without-email)
[ -n "${EMAIL:-}" ] && email_args=(-m "$EMAIL")
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect "${email_args[@]}"
printf '\n\033[1;32mTayyor! https://%s\033[0m\n' "$DOMAIN"
