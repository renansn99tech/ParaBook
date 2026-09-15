#!/usr/bin/env sh
set -eu

python manage.py migrate --noinput
python manage.py seed_admin
gunicorn config.wsgi --bind "0.0.0.0:${PORT:-8000}"
