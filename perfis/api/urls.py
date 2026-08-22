from django.urls import path
from .views import (
    PerfilRetrieveUpdateAPIView,
    PerfilPublicoAPIView,
    AutoresListAPIView,
    SolicitarAutorAPIView,
    AdiarOnboardingAPIView,
    HistoricoPerfilAPIView,
)

urlpatterns = [
    path('meu-perfil/', PerfilRetrieveUpdateAPIView.as_view(), name='api-meu-perfil'),
    path('onboarding/adiar/', AdiarOnboardingAPIView.as_view(), name='api-onboarding-adiar'),
    path('historico/', HistoricoPerfilAPIView.as_view(), name='api-historico-perfil'),
    path('autores/', AutoresListAPIView.as_view(), name='api-autores'),
    path('solicitar-autor/', SolicitarAutorAPIView.as_view(), name='api-solicitar-autor'),
    path('<str:username>/', PerfilPublicoAPIView.as_view(), name='api-perfil-publico'),
]
