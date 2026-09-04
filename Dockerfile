# syntax=docker/dockerfile:1.7
ARG PYTHON_VERSION=3.14

FROM python:${PYTHON_VERSION}-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    VIRTUAL_ENV=/opt/venv

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && python -m venv "$VIRTUAL_ENV"

ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /app
COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

FROM python:${PYTHON_VERSION}-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system parabook \
    && adduser --system --ingroup parabook --home /app parabook

COPY --from=builder /opt/venv /opt/venv
COPY --chown=parabook:parabook . .

RUN mkdir -p /app/staticfiles /app/media \
    && chown -R parabook:parabook /app/staticfiles /app/media \
    && chmod +x /app/scripts/start.sh

USER parabook

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl --fail --silent "http://127.0.0.1:${PORT}/health/" || exit 1

# O script permite migrations no plano gratuito do Render e as desativa quando
# existir uma etapa de release dedicada.
CMD ["sh", "/app/scripts/start.sh"]
