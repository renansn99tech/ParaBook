from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from .models import Notificacao

@login_required
def lista_notificacoes(request):
    notificacoes = Notificacao.objects.filter(usuario=request.user)
    return render(request, 'notificacoes/lista.html', {'notificacoes': notificacoes})

@login_required
def marcar_como_lida(request, pk):
    notificacao = get_object_or_404(Notificacao, pk=pk, usuario=request.user)
    notificacao.lida = True
    notificacao.save()
    
    if notificacao.link:
        return redirect(notificacao.link)
    return redirect('notificacoes:lista')

@login_required
def marcar_todas_como_lidas(request):
    Notificacao.objects.filter(usuario=request.user, lida=False).update(lida=True)
    return redirect('notificacoes:lista')