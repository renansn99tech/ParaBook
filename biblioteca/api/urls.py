# api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LivroViewSet,
    CategoriaViewSet,
    EstanteViewSet,
    SolicitacaoPublicacaoCreateAPIView,
    RecomendacoesIAAPIView,
)

router = DefaultRouter()
router.register(r'livros', LivroViewSet, basename='livro')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'estante', EstanteViewSet, basename='estante')

urlpatterns = [
    path('', include(router.urls)),
    path('solicitacoes-publicacao/', SolicitacaoPublicacaoCreateAPIView.as_view(), name='solicitacao_publicacao_create'),
    path('recomendacoes-ia/', RecomendacoesIAAPIView.as_view(), name='recomendacoes_ia'),
]
