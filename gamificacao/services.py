from datetime import timedelta
from django.utils import timezone
from django.db.models import F
from django.db import transaction
from .models import ProgressoLeitor, Conquista, ConquistaUsuario


# Tabela de cálculo de nível: Cada nível requer (Nível Atual * 100) XP
def calcular_nivel(xp_total):
    """
    Retorna o nível correspondente ao total de XP.
    Exemplo:
      - 0 a 99 XP -> Nível 1
      - 100 a 299 XP -> Nível 2
      - 300 a 599 XP -> Nível 3
    """
    nivel = 1
    xp_acumulado = 0
    while xp_total >= xp_acumulado + (nivel * 100):
        xp_acumulado += nivel * 100
        nivel += 1
    return nivel


class GamificacaoService:

    @staticmethod
    @transaction.atomic
    def adicionar_xp(user, quantidade_xp):
        """
        Adiciona XP ao usuário e atualiza seu nível caso necessário.
        Retorna um dicionário com o status da operação.
        """
        progresso, _ = ProgressoLeitor.objects.get_or_create(user=user)

        # Atualiza XP com suporte à F() expression para evitar race condition
        ProgressoLeitor.objects.filter(pk=progresso.pk).update(
            pontos_xp=F('pontos_xp') + quantidade_xp
        )
        progresso.refresh_from_db()

        novo_nivel = calcular_nivel(progresso.pontos_xp)
        subiu_nivel = False

        if novo_nivel > progresso.nivel:
            progresso.nivel = novo_nivel
            progresso.save(update_fields=['nivel'])
            subiu_nivel = True

        return {
            'xp_ganho': quantidade_xp,
            'xp_total': progresso.pontos_xp,
            'nivel_atual': progresso.nivel,
            'subiu_nivel': subiu_nivel
        }

    @staticmethod
    def atualizar_streak(user):
        """
        Atualiza os dias seguidos de leitura do usuário.
        Deve ser chamado ao registrar uma atividade diária.
        """
        progresso, _ = ProgressoLeitor.objects.get_or_create(user=user)
        hoje = timezone.now().date()

        if progresso.ultima_atividade == hoje:
            # Já realizou atividade hoje, não altera streak
            return progresso.dias_seguidos

        if progresso.ultima_atividade == hoje - timedelta(days=1):
            # Atividade realizada ontem -> incrementa streak
            progresso.dias_seguidos += 1
        else:
            # Quebrou a sequência ou é a primeira atividade
            progresso.dias_seguidos = 1

        progresso.ultima_atividade = hoje
        progresso.save(update_fields=['dias_seguidos', 'ultima_atividade'])
        return progresso.dias_seguidos

    @staticmethod
    def conceder_conquista(user, slug_conquista):
        """
        Concede uma conquista ao usuário se ele ainda não a possuir.
        Também credita a recompensa em XP da conquista.
        """
        try:
            conquista = Conquista.objects.get(slug=slug_conquista)
        except Conquista.DoesNotExist:
            return None

        conquista_usuario, created = ConquistaUsuario.objects.get_or_create(
            user=user,
            conquista=conquista
        )

        if created:
            # Se a conquista foi concedida agora, atribui a recompensa de XP
            GamificacaoService.adicionar_xp(user, conquista.pontos_recompensa)
            return conquista

        return None