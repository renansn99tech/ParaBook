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
from .analytics_autor import (
    AnalyticsAutorExportarAPIView,
    AnalyticsAutorResumoAPIView,
    EventoLeituraCreateAPIView,
)

router = DefaultRouter()
router.register(r'livros', LivroViewSet, basename='livro')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'estante', EstanteViewSet, basename='estante')

urlpatterns = [
    path('', include(router.urls)),
    path('solicitacoes-publicacao/', SolicitacaoPublicacaoCreateAPIView.as_view(), name='solicitacao_publicacao_create'),
    path('recomendacoes-ia/', RecomendacoesIAAPIView.as_view(), name='recomendacoes_ia'),
    path('leitura/eventos/', EventoLeituraCreateAPIView.as_view(), name='evento_leitura_create'),
    path('autor/analytics/resumo/', AnalyticsAutorResumoAPIView.as_view(), name='analytics_autor_resumo'),
    path('autor/analytics/exportar/', AnalyticsAutorExportarAPIView.as_view(), name='analytics_autor_exportar'),
]
