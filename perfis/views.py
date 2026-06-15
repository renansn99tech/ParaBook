from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from usuarios.models import Usuario
from perfis.models import Perfil

@login_required
def perfil(request):
    # Garante que o Usuario existe
    dados_usuario, created = Usuario.objects.get_or_create(
        user_auth=request.user,
        defaults={
            'nome': request.user.username,
            'email': request.user.email
        }
    )

    # Garante que o Perfil existe
    if not dados_usuario.perfil:
        perfil = Perfil.objects.create(
            descricao_perfil="Perfil criado automaticamente",
            historico=""
        )
        dados_usuario.perfil = perfil
        dados_usuario.save()

    perfil_do_usuario = dados_usuario.perfil

    if request.method == 'POST':
        perfil_do_usuario.descricao_perfil = request.POST.get('descricao_perfil')
        perfil_do_usuario.historico = request.POST.get('historico')
        perfil_do_usuario.foto = request.POST.get('foto')
        perfil_do_usuario.bio = request.POST.get('bio')
        perfil_do_usuario.localizacao = request.POST.get('localizacao')
        perfil_do_usuario.username = request.POST.get('username')

        perfil_do_usuario.save()

        dados_usuario.nome = request.POST.get('nome')
        dados_usuario.save()

        return redirect('perfil')

    contexto = {
        'usuario_custom': dados_usuario,
        'perfil': perfil_do_usuario
    }

    return render(request, 'perfis/perfil.html', contexto)


def admin(request):
    return render(request, 'perfis/admin.html')
