
from django.urls import path
from .views import comunidades, acesso_comunidade, conteudo_comunidade

urlpatterns = [
    path('', comunidades, name='comunidades'),
    path('acesso/', acesso_comunidade, name='acesso_comunidade'),
    path('conteudo/', conteudo_comunidade, name='conteudo_comunidade'),
]
