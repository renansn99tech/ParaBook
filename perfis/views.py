from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from usuarios.models import Usuario # Importamos o usuário para pegar os dados sociais

@login_required

# def perfil(request):
#     return render(request, 'perfis/perfil.html')

def perfil(request):
    # R - READ: Buscando o usuário e o perfil correspondente
    dados_usuario = get_object_or_404(Usuario, user_auth=request.user)
    perfil_do_usuario = dados_usuario.perfil
    
    if request.method == 'POST':
        # U - UPDATE: Capturando as novas colunas adicionadas
        perfil_do_usuario.descricao_perfil = request.POST.get('descricao_perfil')
        perfil_do_usuario.historico = request.POST.get('historico')
        
        # Salvando os dados novos do ALTER TABLE
        perfil_do_usuario.foto = request.POST.get('foto')
        perfil_do_usuario.bio = request.POST.get('bio')
        perfil_do_usuario.localizacao = request.POST.get('localizacao')
        perfil_do_usuario.username = request.POST.get('username')
        
        perfil_do_usuario.save()
        
        # Atualiza dados da classe Usuario, se necessário
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