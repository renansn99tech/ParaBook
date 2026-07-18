from django.urls import path
from .views import EstatisticasDashboardAPIView

urlpatterns = [
    path('estatisticas/', EstatisticasDashboardAPIView.as_view(), name='api-dashboard-estatisticas'),
]
