# pyrefly: ignore [missing-import]
from rest_framework import viewsets, status
# pyrefly: ignore [missing-import]
from rest_framework.decorators import action
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
# pyrefly: ignore [missing-import]
from comunidades.models import Comunidade, PostagemComunidade
# pyrefly: ignore [missing-import]
from .serializers import ComunidadeSerializer, PostagemComunidadeSerializer
# pyrefly: ignore [missing-import]
class ComunidadeViewSet(viewsets.ModelViewSet):
    queryset = Comunidade.objects.all()
    serializer_class = ComunidadeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(criador=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def minhas(self, request):
        """Lista apenas as comunidades em que o usuario logado e membro."""
        comunidades = self.get_queryset().filter(membros=request.user)
        serializer = self.get_serializer(comunidades, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def entrar(self, request, pk=None):
        comunidade = self.get_object()
        
        if comunidade.em_manutencao:
            return Response({"erro": "Comunidade em manutenção temporária."}, status=status.HTTP_403_FORBIDDEN)
            
        if request.user in comunidade.membros.all():
            comunidade.membros.remove(request.user)
            return Response({"status": "saiu da comunidade"}, status=status.HTTP_200_OK)
        else:
            if comunidade.membros.count() >= comunidade.max_participantes:
                return Response({"erro": "Comunidade atingiu o limite máximo de membros."}, status=status.HTTP_400_BAD_REQUEST)
            comunidade.membros.add(request.user)
            return Response({"status": "entrou na comunidade"}, status=status.HTTP_200_OK)

class PostagemComunidadeViewSet(viewsets.ModelViewSet):
    queryset = PostagemComunidade.objects.all()
    serializer_class = PostagemComunidadeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        comunidade_id = self.request.query_params.get('comunidade')
        if comunidade_id:
            queryset = queryset.filter(comunidade_id=comunidade_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)
