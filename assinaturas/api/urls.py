from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CheckoutSessionAPIView, PlanoViewSet, MinhaAssinaturaAPIView, PortalSessionAPIView

router = DefaultRouter()
router.register(r'planos', PlanoViewSet, basename='plano')

urlpatterns = [
    path('', include(router.urls)),
    path('minha-assinatura/', MinhaAssinaturaAPIView.as_view(), name='minha_assinatura_api'),
    path('checkout/', CheckoutSessionAPIView.as_view(), name='checkout_session_api'),
    path('portal/', PortalSessionAPIView.as_view(), name='portal_session_api'),
]
