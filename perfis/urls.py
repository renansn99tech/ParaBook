
from django.urls import path
from .views import perfil, painel_admin

# Namespace do app (boa prática)
app_name = 'perfis'

urlpatterns = [
    # Rota do perfil do usuário
    path('perfil/', perfil, name='perfil_pessoal'),
    
    # Rota do painel administrativo customizado
    path('painel-admin/', painel_admin, name='admin_painel'),
]
