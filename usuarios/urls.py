
from django.urls import path
from .views import leitura,tela_login

urlpatterns = [
    path('usuarios/', leitura, name='leitura'),
    path('usuarios/', tela_login, name='tela_login'),
]
