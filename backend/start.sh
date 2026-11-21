#!/bin/sh
# Container entrypoint: apply migrations, then serve with gunicorn.
# Render's free plan has no pre-deploy command, so migrations run here.
set -e

# Neon: migrations should use the direct (non "-pooler") connection when one is provided
DATABASE_URL="${DIRECT_DATABASE_URL:-${DATABASE_URL:-}}" python manage.py migrate --noinput

# Render sets PORT (default 10000); docker-compose uses 8000.
# Render free has 512 MB RAM, so keep the worker count low there.
exec gunicorn tracker.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${WEB_CONCURRENCY:-2}" \
    --threads 2 \
    --timeout 120 \
    --access-logfile -
