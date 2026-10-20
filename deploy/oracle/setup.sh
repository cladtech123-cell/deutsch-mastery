#!/usr/bin/env bash
# Deutsch Mastery — one-shot setup for a fresh Ubuntu server (Oracle Cloud Always Free, Ampere A1 / ARM64; x86 works too).
#
#   git clone https://github.com/cladtech123-cell/deutsch-mastery.git
#   bash deutsch-mastery/deploy/oracle/setup.sh
#
# Safe to re-run (that is also how you update): installs only what is missing, never overwrites .env or the database,
# pulls the latest code and rebuilds. Options (environment variables):
#   TUNNEL=quick   (default) temporary https://…trycloudflare.com address, no account needed
#   TUNNEL=named   permanent address on your domain; needs CLOUDFLARE_TUNNEL_TOKEN (env or .env)
#   TUNNEL=none    no tunnel (you put your own HTTPS reverse proxy in front of 127.0.0.1:8080)
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/cladtech123-cell/deutsch-mastery.git}"
APP_DIR="${APP_DIR:-$HOME/deutsch-mastery}"
TUNNEL="${TUNNEL:-quick}"

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mXato: %s\033[0m\n' "$*" >&2; exit 1; }

install_docker() {
  command -v docker >/dev/null && return
  log "Docker o'rnatilmoqda (rasmiy Docker apt repozitoriysidan)"
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl git openssl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck disable=SC1091
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo systemctl enable --now docker  # containers have restart: unless-stopped, so they come back after a reboot
  sudo usermod -aG docker "$USER"
}

# Creates .env from .env.example with fresh random secrets and production settings. Never overwrites an existing .env.
make_env() {
  [ -f .env ] && return
  log ".env yaratilmoqda (tasodifiy parollar bilan)"
  local db_pw jwt
  db_pw="$(openssl rand -hex 24)"
  jwt="$(openssl rand -hex 48)"
  sed -e "s#<change-me-db-password>#${db_pw}#g" \
      -e "s#<change-me-long-random-secret>#${jwt}#" \
      -e "s#^ENV=.*#ENV=production#" \
      -e "s#^FRONTEND_BIND=.*#FRONTEND_BIND=127.0.0.1#" \
      -e "s#^DEMO_PASSWORD=.*#DEMO_PASSWORD=#" \
      .env.example > .env
  chmod 600 .env
  grep -q "change-me" .env && die ".env da almashtirilmagan <change-me> qoldi"
  return 0
}

main() {
  install_docker
  local docker="docker"
  docker info >/dev/null 2>&1 || docker="sudo docker"  # docker group applies only after a new login

  log "Kod yuklanmoqda: $APP_DIR"
  if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull --ff-only; else git clone "$REPO_URL" "$APP_DIR"; fi
  cd "$APP_DIR"
  make_env

  local profile=()
  case "$TUNNEL" in
    quick) profile=(--profile tunnel) ;;
    named)
      if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
        sed -i "s#^CLOUDFLARE_TUNNEL_TOKEN=.*#CLOUDFLARE_TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}#" .env
      fi
      grep -q '^CLOUDFLARE_TUNNEL_TOKEN=.' .env || die "TUNNEL=named uchun CLOUDFLARE_TUNNEL_TOKEN kerak (.env yoki muhit o'zgaruvchisi)"
      profile=(--profile named-tunnel) ;;
    none) ;;
    *) die "TUNNEL faqat quick, named yoki none bo'lishi mumkin" ;;
  esac

  log "Ilova qurilmoqda va ishga tushirilmoqda (birinchi marta 5–15 daqiqa)"
  $docker compose "${profile[@]}" up -d --build

  log "Backend tayyor bo'lishi kutilmoqda"
  local i
  for i in $(seq 1 90); do
    $docker compose ps backend --format '{{.Status}}' | grep -q "(healthy)" && break
    [ "$i" = 90 ] && die "backend 7.5 daqiqada ishga tushmadi: '$docker compose logs backend' ni ko'ring"
    sleep 5
  done
  curl -fsS "http://127.0.0.1:$(grep -oP '^FRONTEND_HOST_PORT=\K.*' .env || echo 8080)/api/health" && echo

  if [ "$TUNNEL" = quick ]; then
    log "Ochiq HTTPS manzil kutilmoqda"
    local url=""
    for i in $(seq 1 30); do
      url="$($docker compose logs tunnel 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true)"
      [ -n "$url" ] && break
      sleep 2
    done
    [ -n "$url" ] && printf '\n\033[1;32mTayyor! Sayt manzili: %s\033[0m\n' "$url" \
      || echo "Manzil hali chiqmadi: '$docker compose logs tunnel | grep trycloudflare' bilan keyinroq ko'ring."
  else
    printf '\n\033[1;32mTayyor!\033[0m\n'
  fi
}

# Sourcing (e.g. in tests) only defines the functions.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then main "$@"; fi
