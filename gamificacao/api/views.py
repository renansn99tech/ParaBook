from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from gamificacao.models import Conquista, ConquistaUsuario, ProgressoLeitor

from .serializers import ConquistaSerializer, ProgressoLeitorSerializer

# Quantidade de leitores exibidos no ranking, igual ao leaderboard_view legado.
TOP_RANKING = 50


class RankingAPIView(APIView):
    """
    Equivalente da `leaderboard_view` para o front React.
    Devolve o top de leitores por XP e a posição do usuário logado.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        top_leitores = (
            ProgressoLeitor.objects
            .select_related('user')
            .order_by('-pontos_xp', 'user__username')[:TOP_RANKING]
        )

        progresso_atual, _ = ProgressoLeitor.objects.get_or_create(user=request.user)

        # Posição real do usuário, mesmo que ele esteja fora do top exibido.
        acima_de_mim = ProgressoLeitor.objects.filter(
            pontos_xp__gt=progresso_atual.pontos_xp
        ).count()

        ranking = []
        for indice, progresso in enumerate(top_leitores, start=1):
            linha = ProgressoLeitorSerializer(progresso).data
            linha['posicao'] = indice
            linha['sou_eu'] = progresso.user_id == request.user.id
            ranking.append(linha)

        meu_progresso = ProgressoLeitorSerializer(progresso_atual).data
        meu_progresso['posicao'] = acima_de_mim + 1

        return Response({
            'ranking': ranking,
            'meu_progresso': meu_progresso,
            'total_leitores': ProgressoLeitor.objects.count(),
        })


class MinhasConquistasAPIView(APIView):
    """
    Equivalente da `minhas_conquistas_view`: catálogo completo de conquistas
    marcando quais o usuário já desbloqueou.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        desbloqueadas_map = {
            item.conquista_id: item.data_desbloqueio
            for item in ConquistaUsuario.objects.filter(user=request.user)
        }

        conquistas = Conquista.objects.all().order_by('categoria', 'pontos_recompensa')
        serializer = ConquistaSerializer(
            conquistas,
            many=True,
            context={'desbloqueadas_map': desbloqueadas_map}
        )

        progresso, _ = ProgressoLeitor.objects.get_or_create(user=request.user)

        return Response({
            'conquistas': serializer.data,
            'total': conquistas.count(),
            'total_desbloqueadas': len(desbloqueadas_map),
            'xp_conquistado': sum(
                c.pontos_recompensa for c in conquistas if c.id in desbloqueadas_map
            ),
            'meu_progresso': ProgressoLeitorSerializer(progresso).data,
        })


class MeusStatsAPIView(APIView):
    """Versão DRF do `meustats_api_view` (XP/nível/streak para header e widgets)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        progresso, _ = ProgressoLeitor.objects.get_or_create(user=request.user)
        return Response({
            'xp': progresso.pontos_xp,
            'nivel': progresso.nivel,
            'dias_seguidos': progresso.dias_seguidos,
        }, status=status.HTTP_200_OK)
