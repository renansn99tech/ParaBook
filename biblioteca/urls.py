from django.urls import path
from . import views

urlpatterns = [
    path('biblioteca/', views.biblioteca, name='biblioteca'),
    path('acesso-biblioteca/', views.acesso_biblioteca, name='acesso-biblioteca'),
    path('mais-acessados/', views.mais_acessados, name='mais_acessados'),
    path('novidade/', views.novidade, name='novidade'),
    path('obras-autores/', views.obras_autores, name='obras_autores'),
    path('livro/novo/', views.obras_autores, name='criar_livro'),
    path('livro/editar/<int:id>/', views.obras_autores, name='editar_livro'),
    path('livro/deletar/<int:id>/', views.deletar_livro, name='deletar_livro'),
    path('adicionar/<int:livro_id>/', views.adicionar_a_biblioteca, name='adicionar_biblioteca'),
]