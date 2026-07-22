from django.urls import path
from .views import PerfilRetrieveUpdateAPIView, PerfilPublicoAPIView, AutoresListAPIView

urlpatterns = [
    path('meu-perfil/', PerfilRetrieveUpdateAPIView.as_view(), name='api-meu-perfil'),
    path('autores/', AutoresListAPIView.as_view(), name='api-autores'),
    path('<str:username>/', PerfilPublicoAPIView.as_view(), name='api-perfil-publico'),
]
