from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from usuarios.models import Usuario
from biblioteca.models import Livro


# Função auxiliar de teste de segurança
def apenas_superuser(user):
    return user.is_authenticated and user.is_superuser

@login_required
@user_passes_test(apenas_superuser, login_url='home', redirect_field_name=None)
def painel_admin(request):
    
    # --- LOGICA DE APROVAÇÃO DE AUTOR ---
    if request.method == 'POST' and 'btn_gerenciar_solicitacao' in request.POST:
        usuario_id = request.POST.get('usuario_id')
        
        # CORREÇÃO: O valor ('aprovar' ou 'rejeitar') vem dentro do próprio botão clicado
        acao = request.POST.get('btn_gerenciar_solicitacao') 
        
        user_analisado = get_object_or_404(Usuario, id=usuario_id)
        
        if acao == 'aprovar':
            user_analisado.tipo = 'autor'
            user_analisado.save()
            messages.success(request, f"O usuário {user_analisado.nome} agora é oficialmente um Autor!")
        elif acao == 'rejeitar':
            user_analisado.tipo = 'leitor'
            user_analisado.save()
            messages.warning(request, f"A solicitação de {user_analisado.nome} foi recusada.")
            
        return redirect('dashboard:painel_admin')

    # --- CRUD DE LIVROS EXISTENTE ---
    # CREATE (C)
    if request.method == 'POST' and 'btn_add_livro' in request.POST:
        nome_livro = request.POST.get('titulo')
        genero_livro = request.POST.get('categoria')
        autor_livro = request.POST.get('autor', 'Desconhecido')

        if nome_livro and genero_livro:
            Livro.objects.create(
                nome=nome_livro,
                genero=genero_livro,
                autor=autor_livro,
                data_publicacao='2026',
                avaliacao='0',
                isbn='0000000000'
            )
        return redirect('dashboard:painel_admin')

    # DELETE (D)
    elif request.method == 'POST' and 'btn_deletar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')

        if livro_id:
            Livro.objects.filter(id_livro=livro_id).delete()

        return redirect('dashboard:painel_admin')

    # UPDATE (U)
    elif request.method == 'POST' and 'btn_editar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')
        novo_nome = request.POST.get('titulo')
        novo_genero = request.POST.get('categoria')

        if livro_id and novo_nome and novo_genero:
            Livro.objects.filter(
                id_livro=livro_id
            ).update(
                nome=novo_nome,
                genero=novo_genero
            )
        return redirect('dashboard:painel_admin')

    # Coleta de dados para renderização
    todos_livros = Livro.objects.all()
    total_livros = todos_livros.count()
    todos_usuarios = Usuario.objects.all().select_related('user_auth')
    
    # Filtra dinamicamente quem está na fila de espera para exibir na aba de permissões
    solicitacoes_pendentes = Usuario.objects.filter(tipo='aguardando_aprovacao')

    contexto = {
        'livros': todos_livros,
        'total_livros': total_livros,
        'usuarios': todos_usuarios,
        'solicitacoes': solicitacoes_pendentes, # Enviado ao template
    }

    return render(request, 'dashboard/admin.html', contexto)
#########################################################################################################################