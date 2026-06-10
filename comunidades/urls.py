from django.urls import path
from .views import (
    comunidades,
    acesso_comunidade,
    conteudo_comunidade,
    criar_comunidade,
    editar_comunidade,
    excluir_comunidade
)

urlpatterns = [
    path('', comunidades, name='comunidades'),

    path('criar/', criar_comunidade,
         name='criar_comunidade'),

    path('editar/<int:id>/',
         editar_comunidade,
         name='editar_comunidade'),

    path('excluir/<int:id>/',
         excluir_comunidade,
         name='excluir_comunidade'),

    path('acesso/', acesso_comunidade,
         name='acesso_comunidade'),

    path('conteudo/', conteudo_comunidade,
         name='conteudo_comunidade'),
]