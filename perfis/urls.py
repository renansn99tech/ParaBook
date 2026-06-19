
from django.urls import path
from .views import perfil

# Namespace do app (boa prática)
app_name = 'perfis'

urlpatterns = [
    # Rota do perfil do usuário
    path('perfil/', perfil, name='perfil_pessoal'),

]
