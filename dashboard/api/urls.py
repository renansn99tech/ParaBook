from django.urls import path
from .views import (
    EstatisticasDashboardAPIView,
    DashboardUsuariosAPIView,
    DashboardAprovacoesAPIView,
    DashboardDenunciasAPIView,
    DashboardDenunciasComunidadeAPIView,
    DashboardLixeiraAPIView,
    DashboardModeracaoAPIView,
    DashboardAuditoriaAPIView,
    DashboardFeatureFlagsAPIView,
    DashboardFeatureFlagsPublicasAPIView,
    DashboardModelosAdminAPIView,
    DashboardDjangoAdminAcessoAPIView,
)

urlpatterns = [
    path('estatisticas/', EstatisticasDashboardAPIView.as_view(), name='api-dashboard-estatisticas'),
    path('usuarios/', DashboardUsuariosAPIView.as_view(), name='api-dashboard-usuarios'),
    path('aprovacoes/', DashboardAprovacoesAPIView.as_view(), name='api-dashboard-aprovacoes'),
    path('denuncias/', DashboardDenunciasAPIView.as_view(), name='api-dashboard-denuncias'),
    path('denuncias/comunidades/<int:comunidade_id>/', DashboardDenunciasComunidadeAPIView.as_view(), name='api-dashboard-denuncias-comunidade'),
    path('lixeira/', DashboardLixeiraAPIView.as_view(), name='api-dashboard-lixeira'),
    path('moderacao/<str:categoria>/<int:item_id>/', DashboardModeracaoAPIView.as_view(), name='api-dashboard-moderacao'),
    path('auditoria/', DashboardAuditoriaAPIView.as_view(), name='api-dashboard-auditoria'),
    path('modelos-admin/', DashboardModelosAdminAPIView.as_view(), name='api-dashboard-modelos-admin'),
    path('django-admin/acesso/', DashboardDjangoAdminAcessoAPIView.as_view(), name='api-dashboard-django-admin-acesso'),
    path('feature-flags/', DashboardFeatureFlagsAPIView.as_view(), name='api-dashboard-feature-flags'),
    path('feature-flags/publicas/', DashboardFeatureFlagsPublicasAPIView.as_view(), name='api-dashboard-feature-flags-publicas'),
]
