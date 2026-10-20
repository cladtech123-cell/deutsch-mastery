#!/usr/bin/env bash
# Deutsch Mastery — PostgreSQL backup (gzip'd SQL dump), keeps the newest KEEP files.
#   bash ~/deutsch-mastery/deploy/oracle/backup.sh
# Daily at 03:30 via cron (crontab -e):
#   30 3 * * * bash $HOME/deutsch-mastery/deploy/oracle/backup.sh >> $HOME/backups/backup.log 2>&1
# Restore (replaces the current data!), from ~/deutsch-mastery:
#   set -a; . ./.env; set +a
#   gunzip -c FILE.sql.gz | docker compose exec -T db psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"
set -euo pipefail

cd "$(dirname "$0")/../.."
DEST="${BACKUP_DIR:-$HOME/backups}"
KEEP="${KEEP:-14}"
mkdir -p "$DEST"

set -a
# shellcheck disable=SC1091
. ./.env
set +a

file="$DEST/deutsch-mastery-$(date +%Y%m%d-%H%M%S).sql.gz"
# write to a temp name first: a failed dump never looks like a good backup
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner | gzip > "$file.tmp"
mv "$file.tmp" "$file"

# shellcheck disable=SC2012
ls -1t "$DEST"/deutsch-mastery-*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --
echo "$(date '+%F %T') ok: $file ($(du -h "$file" | cut -f1))"
