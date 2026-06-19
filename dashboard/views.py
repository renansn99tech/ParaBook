from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

from usuarios.models import Usuario
from biblioteca.models import Livro


@login_required
def painel_admin(request):

    # CREATE
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

        return redirect('dashboard:admin_painel')

    # DELETE
    elif request.method == 'POST' and 'btn_deletar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')

        if livro_id:
            Livro.objects.filter(id_livro=livro_id).delete()

        return redirect('dashboard:admin_painel')

    # UPDATE
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

        return redirect('dashboard:admin_painel')

    todos_livros = Livro.objects.all()
    total_livros = todos_livros.count()
    todos_usuarios = Usuario.objects.all().select_related('user_auth')

    contexto = {
        'livros': todos_livros,
        'total_livros': total_livros,
        'usuarios': todos_usuarios,
    }

    return render(
        request,
        'dashboard/admin.html',
        contexto
    )