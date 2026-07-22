from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from biblioteca.models import Livro, Categoria, Biblioteca
from .serializers import LivroSerializer, CategoriaSerializer, EstanteSerializer, ResenhaSerializer
from django.http import FileResponse

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

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def resenhas(self, request, pk=None):
        livro = self.get_object()
        # Busca todas as interações desse livro que possuem nota ou resenha
        resenhas = Biblioteca.objects.filter(
            livro=livro
        ).exclude(nota__isnull=True, resenha__isnull=True).exclude(resenha='')
        serializer = ResenhaSerializer(resenhas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def ler_pdf(self, request, pk=None):
        livro = self.get_object()
        if not livro.pdf:
            return Response({"detail": "PDF não encontrado para este livro."}, status=status.HTTP_404_NOT_FOUND)
        
        # Aqui garantimos que o usuário autenticado possa ler, pode ser expandido para validar compra etc.
        try:
            return FileResponse(livro.pdf.open('rb'), content_type='application/pdf')
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EstanteViewSet(viewsets.ModelViewSet):
    serializer_class = EstanteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # O usuário só vê a própria estante
        return Biblioteca.objects.filter(user=self.request.user).order_by('-data_adicao')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

