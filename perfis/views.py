from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from usuarios.models import Usuario

@login_required
def perfil(request):
    dados_usuario = get_object_or_404(Usuario, user_auth=request.user)
    perfil_do_usuario = dados_usuario.perfil

    if request.method == 'POST':
        # Captura os dados do POST
        username = request.POST.get('username')
        descricao_perfil = request.POST.get('descricao_perfil')
        localizacao = request.POST.get('localizacao')
        bio = request.POST.get('bio')
        historico = request.POST.get('historico')
        foto = request.POST.get('foto')
        nome = request.POST.get('nome')

        # Só atualiza se o campo foi enviado e não é None
        if username is not None:
            perfil_do_usuario.username = username
            # Sincroniza com o user de autenticação se foi alterado
            user_auth = request.user
            user_auth.username = username
            user_auth.save()
            
        if descricao_perfil is not None:
            perfil_do_usuario.descricao_perfil = descricao_perfil
            
        if localizacao is not None:
            perfil_do_usuario.localizacao = localizacao
            
        if bio is not None:
            perfil_do_usuario.bio = bio
            
        if historico is not None:
            perfil_do_usuario.historico = historico
            
        if foto is not None:
            perfil_do_usuario.foto = foto
            
        perfil_do_usuario.save()
        
        # Só atualiza o nome de exibição se ele veio no formulário
        if nome is not None:
            dados_usuario.nome = nome
            dados_usuario.save()
                
        # Garante o redirecionamento correto se for o formulário tradicional
        if not request.headers.get('x-requested-with') == 'XMLHttpRequest' and 'fetch' not in request.path:
            return redirect('perfis:perfil_pessoal')
        
    # Mocking/Valores temporários para o template não quebrar enquanto biblioteca/comunidades não chegam
    contexto = {
        'usuario_custom': dados_usuario,
        'perfil': perfil_do_usuario,
        
        # Estatísticas (Temporariamente zeradas para o front-end renderizar sem erros)
        'total_lidos': 0,
        'lendo_agora': 0,
        'total_avaliados': 0,
        'total_comunidades': 0,
        
        # Listas vazias prontas para o {% empty %} do template
        'generos_favoritos': [],
        'autores_favoritos': [],
        'historico': [],
        'favoritos': []
    }

    return render(request, 'perfis/perfil.html', contexto)