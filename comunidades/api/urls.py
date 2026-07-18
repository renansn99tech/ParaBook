from django.urls import path, include
# pyrefly: ignore [missing-import]
from rest_framework.routers import DefaultRouter
from .views import ComunidadeViewSet, PostagemComunidadeViewSet

router = DefaultRouter()
router.register(r'comunidades', ComunidadeViewSet, basename='comunidade')
router.register(r'postagens', PostagemComunidadeViewSet, basename='postagem-comunidade')

urlpatterns = [
    path('', include(router.urls)),
]
