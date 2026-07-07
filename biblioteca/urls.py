from django.urls import path
from . import views

urlpatterns = [
    path('', views.biblioteca, name='biblioteca'),
    path('acesso-biblioteca/', views.acesso_biblioteca, name='acesso_biblioteca'),
    path('mais-acessados/', views.mais_acessados, name='mais_acessados'),
    path('novidade/', views.novidade, name='novidade'),
    path('obras-autores/', views.obras_autores, name='obras_autores'),

    path('livro/novo/', views.obras_autores, name='criar_livro'),
    path('livro/editar/<int:id>/', views.obras_autores, name='editar_livro'),
    path('livro/deletar/<int:id>/', views.deletar_livro, name='deletar_livro'),

    path('adicionar/<int:livro_id>/', views.adicionar_a_biblioteca, name='adicionar_biblioteca'),

    path(
        'biblioteca/remover/<int:livro_id>/',
        views.remover_da_biblioteca,
        name='remover_da_biblioteca'
    ),

    path('leitura/', views.leitura, name='leitura'),
    path('iniciar-leitura/<int:livro_id>/', views.iniciar_leitura, name='iniciar_leitura'), # Nova rota de ação (ela não renderiza tela, apenas processa e redireciona)
    path('concluir-leitura/<int:livro_id>/', views.concluir_leitura, name='concluir_leitura'), # Esta é a rota que o fetch do JavaScript vai bater
    path('avaliar-livro/<int:livro_id>/', views.avaliar_livro, name='avaliar_livro'),
    path('favoritar-livro/<int:livro_id>/', views.favoritar_livro, name='favoritar_livro'),
    path('autores/', views.lista_autores, name='lista_autores'),
]