
from django.urls import path
from .views import leitura, tela_login, register, logout_view # Importe a nova view

urlpatterns = [
    path('leitura/', leitura, name='leitura'),
    path('login/', tela_login, name='tela_login'),
    path('register/', register, name='register'),
    path('logout/', logout_view, name='logout'),
]
