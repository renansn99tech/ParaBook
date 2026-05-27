
from django.urls import path
from .views import biblioteca, acesso_biblioteca, mais_acessados, novidade, obras_autores

urlpatterns = [
    path('biblioteca/', biblioteca, name='biblioteca'),
    path('acesso-biblioteca/', acesso_biblioteca, name='acesso-biblioteca'),
    path('mais-acessados/', mais_acessados, name='mais-acessados'),
    path('novidade/', novidade, name='novidade'),
    path('obras-autores/', obras_autores, name='obras-autores'),
]
