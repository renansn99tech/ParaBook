from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import ProgressoLeitor, Conquista, ConquistaUsuario


@login_required
def leaderboard_view(request):
    """
    Exibe o ranking dos leitores ordenados por XP acumulado.
    """
    top_leitores = ProgressoLeitor.objects.select_related('user').order_by('-pontos_xp')[:50]
    
    # Progresso do usuário atual
    progresso_atual, _ = ProgressoLeitor.objects.get_or_create(user=request.user)

    context = {
        'top_leitores': top_leitores,
        'progresso_atual': progresso_atual,
    }
    return render(request, 'gamificacao/leaderboard.html', context)


@login_required
def minhas_conquistas_view(request):
    """
    Lista todas as conquistas do sistema informando quais o usuário já desbloqueou.
    """
    todas_conquistas = Conquista.objects.all()
    conquistas_desbloqueadas_ids = ConquistaUsuario.objects.filter(
        user=request.user
    ).values_list('conquista_id', flat=True)

    context = {
        'todas_conquistas': todas_conquistas,
        'desbloqueadas_ids': set(conquistas_desbloqueadas_ids),
    }
    return render(request, 'gamificacao/conquistas.html', context)


@login_required
def meustats_api_view(request):
    """
    Endpoint JSON leve para atualizar no header/sidebar os dados de XP, Nível e Streak via AJAX.
    """
    progresso, _ = ProgressoLeitor.objects.get_or_create(user=request.user)
    return JsonResponse({
        'xp': progresso.pontos_xp,
        'nivel': progresso.nivel,
        'dias_seguidos': progresso.dias_seguidos,
    })