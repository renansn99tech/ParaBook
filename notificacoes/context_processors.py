from .models import Notificacao

def notificacoes_processor(request):
    if request.user.is_authenticated:
        count = Notificacao.objects.filter(usuario=request.user, lida=False).count()
        return {
            'notificacoes_nao_lidas_count': count
        }
    return {
        'notificacoes_nao_lidas_count': 0
    }