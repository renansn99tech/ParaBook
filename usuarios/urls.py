from django.urls import path
from .views import leitura, tela_login, register, logout_view # Importe a nova view

# ATENÇÃO: Essa linha é obrigatória para o Django enxergar o app "usuarios"
app_name = 'usuarios'

urlpatterns = [
    path('leitura/', leitura, name='leitura'),
    path('login/', tela_login, name='login'),
    path('register/', register, name='register'),
    path('logout/', logout_view, name='logout'),
]
