from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from usuarios.models import Usuario 
from biblioteca.models import Livro
@login_required
def perfil(request):
    dados_usuario = get_object_or_404(Usuario, user_auth=request.user)
    perfil_do_usuario = dados_usuario.perfil

    if request.method == 'POST':
        username = request.POST.get('username')
        descricao_perfil = request.POST.get('descricao_perfil')
        localizacao = request.POST.get('localizacao')
        bio = request.POST.get('bio')
        historico = request.POST.get('historico')
        foto = request.POST.get('foto')
        nome = request.POST.get('nome')

        if username is not None:
            perfil_do_usuario.username = username
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
        
        if nome is not None:
            dados_usuario.nome = nome
            dados_usuario.save()
                
        if not request.headers.get('x-requested-with') == 'XMLHttpRequest' and 'fetch' not in request.path:
            return redirect('perfis:perfil_pessoal')
        
    contexto = {
        'usuario_custom': dados_usuario,
        'perfil': perfil_do_usuario,
        'total_lidos': 0,
        'lendo_agora': 0,
        'total_avaliados': 0,
        'total_comunidades': 0,
        'generos_favoritos': [],
        'autores_favoritos': [],
        'historico': [],
        'favoritos': []
    }

    return render(request, 'perfis/perfil.html', contexto)


# VIEW DO SEU ADMIN CUSTOMIZADO
    # Corrigido para renderizar o seu HTML correto
    # return render(request, 'perfis/admin.html')
@login_required
def painel_admin(request):
    # 1. CREATE: Adicionar um Livro
    if request.method == 'POST' and 'btn_add_livro' in request.POST:
        nome_livro = request.POST.get('titulo')  
        genero_livro = request.POST.get('categoria') 
        autor_livro = request.POST.get('autor', 'Desconhecido') 
        
        if nome_livro and genero_livro:
            # Salvando usando os campos exatos do seu modelo
            Livro.objects.create(
                nome=nome_livro, 
                genero=genero_livro, 
                autor=autor_livro,
                data_publicacao='2026', 
                avaliacao='0',
                isbn='0000000000'
            )
            return redirect('perfis:admin_painel') 

    # 2. DELETE: Deletar um Livro
    elif request.method == 'POST' and 'btn_deletar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')
        Livro.objects.filter(id_livro=livro_id).delete() # Usa 'id_livro'
        return redirect('perfis:admin_painel')

    # 3. UPDATE: Editar um Livro
    elif request.method == 'POST' and 'btn_editar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')
        novo_nome = request.POST.get('titulo')
        novo_genero = request.POST.get('categoria')
        
        if livro_id and novo_nome and novo_genero:
            Livro.objects.filter(id_livro=livro_id).update(nome=novo_nome, genero=novo_genero)
            return redirect('perfis:admin_painel')

    # Buscando os dados reais do banco para mandar pro HTML
    todos_livros = Livro.objects.all()
    total_livros = todos_livros.count()
    todos_usuarios = Usuario.objects.all().select_related('user_auth')

    contexto = {
        'livros': todos_livros,
        'total_livros': total_livros,
        'usuarios': todos_usuarios,
    }

    return render(request, 'perfis/admin.html', contexto)