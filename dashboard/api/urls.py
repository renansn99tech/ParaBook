from django.urls import path
from .views import (
    EstatisticasDashboardAPIView,
    DashboardUsuariosAPIView,
    DashboardAprovacoesAPIView,
    DashboardDenunciasAPIView,
    DashboardLixeiraAPIView,
    DashboardModeracaoAPIView,
    DashboardAuditoriaAPIView,
    DashboardFeatureFlagsAPIView,
)

urlpatterns = [
    path('estatisticas/', EstatisticasDashboardAPIView.as_view(), name='api-dashboard-estatisticas'),
    path('usuarios/', DashboardUsuariosAPIView.as_view(), name='api-dashboard-usuarios'),
    path('aprovacoes/', DashboardAprovacoesAPIView.as_view(), name='api-dashboard-aprovacoes'),
    path('denuncias/', DashboardDenunciasAPIView.as_view(), name='api-dashboard-denuncias'),
    path('lixeira/', DashboardLixeiraAPIView.as_view(), name='api-dashboard-lixeira'),
    path('moderacao/<str:categoria>/<int:item_id>/', DashboardModeracaoAPIView.as_view(), name='api-dashboard-moderacao'),
    path('auditoria/', DashboardAuditoriaAPIView.as_view(), name='api-dashboard-auditoria'),
    path('feature-flags/', DashboardFeatureFlagsAPIView.as_view(), name='api-dashboard-feature-flags'),
]
