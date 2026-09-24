#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    if [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
        python manage.py migrate --noinput --database=migration
    else
        python manage.py migrate --noinput
    fi
fi

if [ "${RUN_SEED_DEMONSTRATIVO:-false}" = "true" ]; then
    # Dados de visualização são preservados no banco e controlados pela
    # feature flag conteudo_demonstrativo. A role de runtime é barrada pelo
    # RLS do Supabase; a credencial proprietária fica restrita a este processo.
    if [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
        DATABASE_URL="$MIGRATION_DATABASE_URL" MIGRATION_DATABASE_URL= \
            python manage.py seed_demonstrativo --if-needed
    else
        python manage.py seed_demonstrativo --if-needed
    fi
fi

# No plano Free, o Render não oferece pre-deploy command. A credencial
# proprietária não é herdada pelo Gunicorn depois das tarefas de inicialização.
unset MIGRATION_DATABASE_URL

if [ "${RUN_SEED_ADMIN:-false}" = "true" ]; then
    # seed_admin valida as três SEED_ADMIN_* e falha explicitamente se a
    # criação/rotação do administrador foi habilitada sem credenciais.
    python manage.py seed_admin
fi

python manage.py collectstatic --noinput

exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --no-control-socket \
    --workers "${GUNICORN_WORKERS:-2}" \
    --threads "${GUNICORN_THREADS:-2}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --access-logfile - \
    --error-logfile -
