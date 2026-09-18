#!/usr/bin/env sh
set -eu

# Compatibilidade com configurações antigas do Render/Procfile. Toda a
# inicialização vive em um único script para não perder collectstatic,
# credencial dedicada de migration nem os limites do Gunicorn.
exec sh scripts/start.sh
