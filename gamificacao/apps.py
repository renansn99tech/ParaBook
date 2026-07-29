from django.apps import AppConfig


class GamificacaoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gamificacao'

    def ready(self):
        # Importa os sinais para que sejam registrados no startup do Django
        import gamificacao.signals