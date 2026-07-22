from django.urls import path
from .views import (
    EstatisticasDashboardAPIView,
    DashboardUsuariosAPIView,
    DashboardAprovacoesAPIView,
    DashboardDenunciasAPIView,
    DashboardLixeiraAPIView
)

urlpatterns = [
    path('estatisticas/', EstatisticasDashboardAPIView.as_view(), name='api-dashboard-estatisticas'),
    path('usuarios/', DashboardUsuariosAPIView.as_view(), name='api-dashboard-usuarios'),
    path('aprovacoes/', DashboardAprovacoesAPIView.as_view(), name='api-dashboard-aprovacoes'),
    path('denuncias/', DashboardDenunciasAPIView.as_view(), name='api-dashboard-denuncias'),
    path('lixeira/', DashboardLixeiraAPIView.as_view(), name='api-dashboard-lixeira'),
]
