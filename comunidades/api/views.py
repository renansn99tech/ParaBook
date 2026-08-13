# pyrefly: ignore [missing-import]
from django.db.models import Q
# pyrefly: ignore [missing-import]
from rest_framework import viewsets, status
# pyrefly: ignore [missing-import]
from rest_framework.decorators import action
# pyrefly: ignore [missing-import]
from rest_framework.exceptions import PermissionDenied, ValidationError
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
# pyrefly: ignore [missing-import]
from comunidades.models import Comunidade, PostagemComunidade
# pyrefly: ignore [missing-import]
from .permissions import IsAutorDaPostagemOuAdmin, IsCriadorOuAdmin
# pyrefly: ignore [missing-import]
from .serializers import (
    ComunidadeSerializer,
    MembroComunidadeSerializer,
    PostagemComunidadeSerializer,
)
from usuarios.audit import registrar_acao

# REGRA 10: teto de comunidades criadas por um leitor/autor.
LIMITE_COMUNIDADES_POR_USUARIO = 5
# REGRAS 8 e 9: lotação padrão de sala comum e de sala oficial.
MAX_PARTICIPANTES_USUARIO = 200
MAX_PARTICIPANTES_OFICIAL = 500
# Denúncias necessárias para o admin poder excluir uma comunidade de usuário.
# Protege o criador contra exclusão por capricho; abaixo disso a API recusa.
MIN_DENUNCIAS_PARA_EXCLUSAO = 10


# pyrefly: ignore [missing-import]
class ComunidadeViewSet(viewsets.ModelViewSet):
    queryset = Comunidade.objects.all()
    serializer_class = ComunidadeSerializer
    permission_classes = [IsCriadorOuAdmin]

    def get_queryset(self):
        """
        Comunidade desativada some da vitrine para quem não é membro.
        Membros e admin continuam enxergando (opaca, com badge no front),
        e o detalhe por id segue acessível para exibir o aviso de desativada.
        """
        queryset = super().get_queryset()

        if self.action != 'list':
            return queryset

        usuario = self.request.user
        if usuario.is_authenticated:
            if usuario.is_superuser:
                return queryset
            return queryset.filter(Q(em_manutencao=False) | Q(membros=usuario)).distinct()

        return queryset.filter(em_manutencao=False)

    def destroy(self, request, *args, **kwargs):
        """
        O criador apaga a própria comunidade livremente. O admin, porém, só
        derruba comunidade de usuário depois de ela acumular denúncias — assim
        a moderação não vira remoção por capricho.

        Escotilha de emergência: `?forcar=true` ignora o mínimo de denúncias.
        Restrita a superusuário e pensada para abuso grave (conteúdo ilegal),
        em que esperar o contador não é aceitável.
        """
        comunidade = self.get_object()
        e_dono = comunidade.criador_id == request.user.id

        if request.user.is_superuser and not e_dono and not comunidade.criada_por_sistema:
            forcar = str(request.query_params.get('forcar', '')).lower() == 'true'

            if not forcar and comunidade.total_denuncias < MIN_DENUNCIAS_PARA_EXCLUSAO:
                faltam = MIN_DENUNCIAS_PARA_EXCLUSAO - comunidade.total_denuncias
                raise PermissionDenied({
                    'detail': (
                        f"'{comunidade.nome}' tem {comunidade.total_denuncias} de "
                        f"{MIN_DENUNCIAS_PARA_EXCLUSAO} denúncias necessárias para exclusão."
                    ),
                    'total_denuncias': comunidade.total_denuncias,
                    'minimo_denuncias': MIN_DENUNCIAS_PARA_EXCLUSAO,
                    'faltam': faltam,
                })

        comunidade_id = comunidade.pk
        forcar = str(request.query_params.get('forcar', '')).lower() == 'true'
        response = super().destroy(request, *args, **kwargs)
        registrar_acao(
            ator=request.user,
            acao='comunidade.excluida',
            recurso='Comunidade',
            recurso_id=comunidade_id,
            metadados={'forcada': forcar},
        )
        return response

    def perform_create(self, serializer):
        usuario = self.request.user

        # Admin cria sala oficial (mesmo comportamento do Dashboard legado);
        # leitor/autor cria sala comum e vira membro dela automaticamente.
        if usuario.is_superuser:
            serializer.save(
                criador=usuario,
                criada_por_sistema=True,
                max_participantes=MAX_PARTICIPANTES_OFICIAL,
            )
            return

        total_criadas = Comunidade.objects.filter(criador=usuario).count()
        if total_criadas >= LIMITE_COMUNIDADES_POR_USUARIO:
            raise ValidationError({
                'detail': (
                    f"Você atingiu o limite máximo de "
                    f"{LIMITE_COMUNIDADES_POR_USUARIO} comunidades criadas."
                )
            })

        comunidade = serializer.save(
            criador=usuario,
            criada_por_sistema=False,
            max_participantes=MAX_PARTICIPANTES_USUARIO,
        )
        comunidade.membros.add(usuario)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def minhas(self, request):
        """Lista apenas as comunidades em que o usuario logado e membro."""
        comunidades = self.get_queryset().filter(membros=request.user)
        serializer = self.get_serializer(comunidades, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def criadas_por_mim(self, request):
        """Comunidades das quais o usuario logado e dono, para a tela de gestao."""
        comunidades = self.get_queryset().filter(criador=request.user)
        serializer = self.get_serializer(comunidades, many=True)
        return Response({
            'comunidades': serializer.data,
            'total': comunidades.count(),
            'limite': LIMITE_COMUNIDADES_POR_USUARIO,
            'pode_criar': (
                request.user.is_superuser
                or comunidades.count() < LIMITE_COMUNIDADES_POR_USUARIO
            ),
        })

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def membros(self, request, pk=None):
        """Lista os membros da comunidade para o painel de Configurações."""
        comunidade = self.get_object()
        membros = comunidade.membros.all().order_by('username')

        return Response({
            'membros': MembroComunidadeSerializer(
                membros,
                many=True,
                context={'comunidade': comunidade}
            ).data,
            'total': membros.count(),
            'max_participantes': comunidade.max_participantes,
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def desativar(self, request, pk=None):
        """
        Liga/desliga a desativação temporária (campo `em_manutencao`).
        Restrito ao admin e apenas em comunidades oficiais: sala de usuário
        pertence ao criador, que a exclui se quiser tirá-la do ar.
        """
        comunidade = self.get_object()

        if not request.user.is_superuser:
            raise PermissionDenied("Apenas administradores podem desativar comunidades.")

        if not comunidade.criada_por_sistema:
            raise PermissionDenied(
                "Só comunidades oficiais do ParaBook podem ser desativadas por aqui."
            )

        comunidade.em_manutencao = not comunidade.em_manutencao
        comunidade.save(update_fields=['em_manutencao'])
        registrar_acao(
            ator=request.user,
            acao='comunidade.status_alterado',
            recurso='Comunidade',
            recurso_id=comunidade.pk,
            metadados={'em_manutencao': comunidade.em_manutencao},
        )

        return Response({
            'em_manutencao': comunidade.em_manutencao,
            'detail': (
                f"'{comunidade.nome}' foi desativada temporariamente."
                if comunidade.em_manutencao
                else f"'{comunidade.nome}' voltou a ficar visível para todos."
            ),
        })

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
    permission_classes = [IsAutorDaPostagemOuAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        comunidade_id = self.request.query_params.get('comunidade')
        if comunidade_id:
            queryset = queryset.filter(comunidade_id=comunidade_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)
