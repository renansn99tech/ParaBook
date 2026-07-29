from django.urls import path
from . import views

app_name = 'gamificacao'

urlpatterns = [
    path('ranking/', views.leaderboard_view, name='leaderboard'),
    path('minhas-conquistas/', views.minhas_conquistas_view, name='minhas_conquistas'),
    path('api/meus-stats/', views.meustats_api_view, name='meus_stats'),
]