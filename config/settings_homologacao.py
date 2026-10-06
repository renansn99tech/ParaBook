"""Homologação local isolada: Linux/Gunicorn, DEBUG=False e arquivos persistentes.

Não aceita banco de uso real. Os segredos são efêmeros ou ficam na custódia
restrita; nunca usar esta configuração como configuração produtiva.
"""
import os
from pathlib import Path
from urllib.parse import urlsplit

from django.core.exceptions import ImproperlyConfigured

_url = os.environ.get('G5_HOMOLOG_DATABASE_URL', '')
_target = urlsplit(_url)
if (_target.scheme not in {'postgres', 'postgresql'}
        or _target.hostname != 'g5-s019-homolog-db'
        or _target.path != '/g5_homolog_s019'):
    raise ImproperlyConfigured('Homologação exige o banco sintético dedicado.')
_key = os.environ.get('G5_HOMOLOG_PROOF_KEY', '')
if not _key:
    raise ImproperlyConfigured('Informe chave dedicada da homologação.')

os.environ.update({
    'DATABASE_URL': _url, 'MIGRATION_DATABASE_URL': '', 'DEBUG': 'False',
    'SUPABASE_STORAGE_ENABLED': 'False', 'PAYMENTS_ENABLED': 'False',
    'EMAIL_ENABLED': 'False', 'PASSWORD_RESET_ENABLED': 'False',
    'SERVERLESS': 'False', 'SHARED_SITE_ENFORCED': 'False',
    'ALLOWED_HOSTS': 'localhost,127.0.0.1',
    'FRONTEND_URL': 'https://localhost:55441',
    'CSRF_TRUSTED_ORIGINS': 'https://localhost:55441',
    'PRIVACY_EVIDENCE_KEY': _key, 'PRIVACY_EVIDENCE_KEY_ID': 'g5-homolog-s019-v1',
})

from .settings import *  # noqa: E402,F403

MEDIA_ROOT = Path('/homologacao/media')
STATIC_ROOT = Path('/homologacao/static')
DATABASES['default']['OPTIONS'].update(  # noqa: F405
    sslmode='verify-full', sslrootcert='/homologacao/tls/cert.pem',
)
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
