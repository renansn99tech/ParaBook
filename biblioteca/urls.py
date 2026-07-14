# biblioteca/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.biblioteca, name='biblioteca'),
    
    # CORREÇÃO ERRO 1: Nome mapeado como acesso_biblioteca para resolver o NoReverseMatch
    path('acesso-biblioteca/', views.acesso_biblioteca, name='acesso_biblioteca'),
    
    path('mais-acessados/', views.mais_acessados, name='mais_acessados'),
    path('novidade/', views.novidade, name='novidade'),
    
    # Nova nomenclatura arquitetural substituindo obras-autores
    path('solicitacoes-publicacao/', views.solicitacoes_publicacao, name='solicitacoes_publicacao'),
    
    # CORREÇÃO ERRO 3: Rota espelho legada para garantir compatibilidade com templates antigos
    path('solicitacoes-publicacao/legado/', views.solicitacoes_publicacao, name='obras_autores'),

    # Rotas de gerenciamento do acervo de Livros desatreladas da view legada
    path('livro/novo/', views.criar_livro, name='criar_livro'),
    path('livro/editar/<int:id>/', views.editar_livro, name='editar_livro'),
    path('livro/deletar/<int:id>/', views.deletar_livro, name='deletar_livro'),

    path('adicionar/<int:livro_id>/', views.adicionar_a_biblioteca, name='adicionar_biblioteca'),

    path(
        'biblioteca/remover/<int:livro_id>/',
        views.remover_da_biblioteca,
        name='remover_da_biblioteca'
    ),

    path('leitura/', views.leitura, name='leitura'),
    path('iniciar-leitura/<int:livro_id>/', views.iniciar_leitura, name='iniciar_leitura'),
    path('concluir-leitura/<int:livro_id>/', views.concluir_leitura, name='concluir_leitura'),
    path('avaliar-livro/<int:livro_id>/', views.avaliar_livro, name='avaliar_livro'),
    path('favoritar-livro/<int:livro_id>/', views.favoritar_livro, name='favoritar_livro'),
    path('livro/<int:id>/', views.livro_info, name='livro_info'),
    path('livro/<int:id>/denunciar/', views.registrar_denuncia, name='registrar_denuncia'),
    path('moderacao/', views.painel_moderacao, name='painel_moderacao'),
    path('moderacao/resolver/<int:id_denuncia>/', views.resolver_denuncia, name='resolver_denuncia'),
    path('autores/', views.lista_autores, name='lista_autores'),
]