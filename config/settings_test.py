"""Testes locais/CI com PostgreSQL sintético e sem serviços externos.

Não lê a conexão real de .env. O banco deve ser criado exclusivamente para
testes; o runner Django ainda cria seu próprio banco test_*.
"""
import os
from urllib.parse import urlsplit

from django.core.exceptions import ImproperlyConfigured

_test_url = os.environ.get(
    'G5_TEST_DATABASE_URL',
    'postgres://g5_test:g5_synthetic_only@127.0.0.1:55439/g5_s019',
)
_target = urlsplit(_test_url)
if (
    _target.scheme not in {'postgres', 'postgresql'}
    or _target.hostname not in {'localhost', '127.0.0.1'}
    or not _target.path.lstrip('/').startswith(('g5_', 'parabook_ci'))
):
    raise ImproperlyConfigured('Use somente PostgreSQL local dedicado a testes.')
os.environ.update({
    'DATABASE_URL': _test_url,
    'MIGRATION_DATABASE_URL': '',
    'DEBUG': 'True',
    'SECRET_KEY': 'synthetic-tests-only-never-use-in-production',
    'SUPABASE_STORAGE_ENABLED': 'False',
    'EMAIL_ENABLED': 'False',
    'PAYMENTS_ENABLED': 'False',
    'PASSWORD_RESET_ENABLED': 'False',
    'SERVERLESS': 'False',
    'SHARED_SITE_ENFORCED': 'False',
})

from .settings import *  # noqa: E402,F403

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']
PRIVACY_EVIDENCE_KEY = 'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA='
PRIVACY_EVIDENCE_KEY_ID = 'synthetic-v1'
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
