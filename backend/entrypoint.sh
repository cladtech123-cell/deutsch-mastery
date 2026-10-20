#!/bin/sh
set -e
alembic upgrade head
if [ -n "$DEMO_PASSWORD" ]; then
  python -m scripts.seed --demo
else
  python -m scripts.seed
fi
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips="*"
