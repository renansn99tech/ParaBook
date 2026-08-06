from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlanoViewSet, MinhaAssinaturaAPIView

router = DefaultRouter()
router.register(r'planos', PlanoViewSet, basename='plano')

urlpatterns = [
    path('', include(router.urls)),
    path('minha-assinatura/', MinhaAssinaturaAPIView.as_view(), name='minha_assinatura_api'),
]
