from django.urls import path
from .views import PerfilRetrieveUpdateAPIView

urlpatterns = [
    path('meu-perfil/', PerfilRetrieveUpdateAPIView.as_view(), name='api-meu-perfil'),
]
