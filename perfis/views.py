from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import Perfil

@login_required
def perfil(request):
    perfil, created = Perfil.objects.get_or_create(
        username=request.user.username
    )

    if request.method == 'POST':
        perfil.descricao_perfil = request.POST.get('descricao_perfil')
        perfil.localizacao = request.POST.get('localizacao')
        perfil.bio = request.POST.get('bio')
        perfil.historico = request.POST.get('historico')
        perfil.username = request.POST.get('username')

        if request.POST.get('foto'):
            perfil.foto = request.POST.get('foto')

        perfil.save()

        return redirect('perfis:perfil_pessoal')

    return render(request, 'perfis/perfil.html', {
        'perfil': perfil
    })