from django.urls import path
from .views import (
     comunidades,
     acesso_comunidade,
     conteudo_comunidade,
     criar_comunidade,
     editar_comunidade,
     excluir_comunidade,
     participar_comunidade,
     excluir_postagem,
     editar_postagem
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

     path('conteudo/<int:id>/', conteudo_comunidade, 
          name='conteudo_comunidade'),

     path('participar/<int:id>/', participar_comunidade, name='participar_comunidade'),
     path('postagem/excluir/<int:id>/', excluir_postagem, name='excluir_postagem'),
     path('postagem/editar/<int:id>/', editar_postagem, name='editar_postagem'),
]