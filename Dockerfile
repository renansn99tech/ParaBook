FROM python:3.11-slim

# Evita que o Python grave arquivos .pyc e força que os logs não passem por buffer
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Define o diretório de trabalho no container
WORKDIR /app

# Instala dependências do sistema necessárias para o psycopg2 e MySQL (legado)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        default-libmysqlclient-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala as dependências do Python
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copia o código da aplicação
COPY . /app/

# Expõe a porta 8000
EXPOSE 8000
