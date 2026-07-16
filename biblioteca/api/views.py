from rest_framework import viewsets, permissions, filters
from django.db.models import Q
from biblioteca.models import Livro, Categoria
from .serializers import LivroSerializer, CategoriaSerializer

class CategoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.AllowAny]

class LivroViewSet(viewsets.ModelViewSet):
    serializer_class = LivroSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titulo', 'autor']

    def get_queryset(self):
        # Implementação do RBAC para a listagem de livros
        qs = Livro.objects.exclude(status='removido')
        user = self.request.user
        
        if not user.is_authenticated:
            return qs.filter(status='publicado')
            
        try:
            tipo = user.perfil_customizado.tipo
        except:
            tipo = 'leitor'

        if tipo == 'admin':
            return qs
        elif tipo == 'autor':
            return qs.filter(Q(status='publicado') | Q(autor=user.perfil_customizado.nome))
        else:
            return qs.filter(status='publicado')
