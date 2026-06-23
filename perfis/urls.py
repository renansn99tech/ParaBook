from django.urls import path
from .views import perfil, virar_autor

# Namespace do app (boa prática)
app_name = 'perfis'

urlpatterns = [
    # Rota do perfil do usuário
    path('perfil/', perfil, name='perfil_pessoal'),
    path('perfil/upgrade/', virar_autor, name='virar_autor'), # <-- Nova Rota para Autores
]
