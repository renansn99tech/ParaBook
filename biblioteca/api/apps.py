# biblioteca/api/apps.py
from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'biblioteca.api'  # <--- Deve ser 'biblioteca.api'