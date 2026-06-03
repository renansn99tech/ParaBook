from django.urls import path
from .views import perfil, admin

# Com isso isola-se as rotas do app e evita conflitos com o app 'usuarios'
app_name = 'perfis'

urlpatterns = [
    path('perfil/', perfil, name='perfil_pessoal'), # Mudamos o nome interno para ficar mais claro
    path('admin/', admin, name='admin_painel'), 
]