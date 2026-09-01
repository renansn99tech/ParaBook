from django.urls import path
from .views import (
    PerfilRetrieveUpdateAPIView,
    PerfilPublicoAPIView,
    AutoresListAPIView,
    SolicitarAutorAPIView,
    AdiarOnboardingAPIView,
    HistoricoPerfilAPIView,
    InicioPersonalizadoAPIView,
    ResumoLeituraAPIView,
)

urlpatterns = [
    path('meu-perfil/', PerfilRetrieveUpdateAPIView.as_view(), name='api-meu-perfil'),
    path('onboarding/adiar/', AdiarOnboardingAPIView.as_view(), name='api-onboarding-adiar'),
    path('historico/', HistoricoPerfilAPIView.as_view(), name='api-historico-perfil'),
    path('resumo-leitura/', ResumoLeituraAPIView.as_view(), name='api-resumo-leitura'),
    path('inicio/', InicioPersonalizadoAPIView.as_view(), name='api-inicio-personalizado'),
    path('autores/', AutoresListAPIView.as_view(), name='api-autores'),
    path('solicitar-autor/', SolicitarAutorAPIView.as_view(), name='api-solicitar-autor'),
    path('<str:username>/', PerfilPublicoAPIView.as_view(), name='api-perfil-publico'),
]
