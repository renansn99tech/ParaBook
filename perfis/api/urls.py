from django.urls import path
from .views import PerfilRetrieveUpdateAPIView, PerfilPublicoAPIView

urlpatterns = [
    path('meu-perfil/', PerfilRetrieveUpdateAPIView.as_view(), name='api-meu-perfil'),
    path('<str:username>/', PerfilPublicoAPIView.as_view(), name='api-perfil-publico'),
]
