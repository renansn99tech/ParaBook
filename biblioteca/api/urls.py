# api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import LivroViewSet, CategoriaViewSet, EstanteViewSet

router = DefaultRouter()
router.register(r'livros', LivroViewSet, basename='livro')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'estante', EstanteViewSet, basename='estante')

urlpatterns = [
    path('', include(router.urls)),
    
    # Endpoints JWT para login via API
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]