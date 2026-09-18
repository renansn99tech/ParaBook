#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    if [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
        python manage.py migrate --noinput --database=migration
    else
        python manage.py migrate --noinput
    fi
fi

# No plano Free, o Render não oferece pre-deploy command. A credencial
# proprietária não é herdada pelo Gunicorn depois que a migration termina.
unset MIGRATION_DATABASE_URL

if [ "${RUN_SEED_ACERVO:-false}" = "true" ]; then
    # O comando retorna sem escrita quando as 11 categorias e 55 obras-base
    # já existem. Se o acervo estiver parcial, cria somente os itens ausentes.
    python manage.py seed_acervo --if-needed
fi

if [ "${RUN_SEED_ADMIN:-false}" = "true" ]; then
    # seed_admin valida as três SEED_ADMIN_* e falha explicitamente se a
    # criação/rotação do administrador foi habilitada sem credenciais.
    python manage.py seed_admin
fi

python manage.py collectstatic --noinput

exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${GUNICORN_WORKERS:-2}" \
    --threads "${GUNICORN_THREADS:-2}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --access-logfile - \
    --error-logfile -
