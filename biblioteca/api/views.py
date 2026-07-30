# api/views.py
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
        qs = Livro.objects.exclude(status='removido')
        user = self.request.user
        
        if not user.is_authenticated:
            return qs.filter(status='publicado')
            
        # RBAC adaptado para os campos nativos do User e Perfil do Parabook
        if user.is_staff or user.is_superuser:
            return qs

        # Verifica se o usuário é autor via username/nome do perfil
        autor_nome = user.username
        if hasattr(user, 'perfil_da_biblioteca'):
            # Permite visualizar livros publicados ou criados pelo próprio autor
            return qs.filter(Q(status='publicado') | Q(autor__icontains=autor_nome))
            
        return qs.filter(status='publicado')

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def resenhas(self, request, pk=None):
        livro = self.get_object()
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
        
        try:
            return FileResponse(livro.pdf.open('rb'), content_type='application/pdf')
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EstanteViewSet(viewsets.ModelViewSet):
    serializer_class = EstanteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Biblioteca.objects.filter(user=self.request.user).order_by('-data_adicao')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)