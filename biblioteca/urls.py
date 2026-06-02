
from django.urls import path
from .views import biblioteca, acesso_biblioteca, mais_acessados, novidade, obras_autores
from biblioteca import views

urlpatterns = [
    path('biblioteca/', biblioteca, name='biblioteca'),
    path('acesso-biblioteca/', acesso_biblioteca, name='acesso-biblioteca'),
    path('mais-acessados/', views.mais_acessados, name='mais_acessados'),
    path('novidade/', views.novidade, name='novidade'),
    # 🔥 envio de obras
    path('obras-autores/', views.obras_autores, name='obras_autores'),
    # CREATE + UPDATE (mesma view)
    path('obras-autores/', views.obras_autores, name='obras-autores'),
    path('livro/novo/', views.obras_autores, name='criar_livro'),
    path('livro/editar/<int:id>/', views.obras_autores, name='editar_livro'),

    # DELETE
    path('livro/deletar/<int:id>/', views.deletar_livro, name='deletar_livro'),
]

