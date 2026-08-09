from django.urls import path

from .views import MeusStatsAPIView, MinhasConquistasAPIView, RankingAPIView

urlpatterns = [
    path('ranking/', RankingAPIView.as_view(), name='api-ranking'),
    path('minhas-conquistas/', MinhasConquistasAPIView.as_view(), name='api-minhas-conquistas'),
    path('meus-stats/', MeusStatsAPIView.as_view(), name='api-meus-stats'),
]
