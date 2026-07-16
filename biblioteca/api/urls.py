from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LivroViewSet, CategoriaViewSet

router = DefaultRouter()
router.register(r'livros', LivroViewSet, basename='livro')
router.register(r'categorias', CategoriaViewSet, basename='categoria')

urlpatterns = [
    path('', include(router.urls)),
]
