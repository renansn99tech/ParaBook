from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.contrib.auth.models import User
from usuarios.models import Usuario
from biblioteca.models import Livro, Categoria, ObraAutor
from django.core.files.storage import FileSystemStorage

def apenas_superuser(user):
    return user.is_authenticated and user.is_superuser

@login_required
@user_passes_test(apenas_superuser, login_url='home', redirect_field_name=None)
def painel_admin(request):
    
    # --- LÓGICA DE GERENCIAMENTO DE SOLICITAÇÃO (AUTOR) ---
    if request.method == 'POST' and 'btn_gerenciar_solicitacao' in request.POST:
        obra_id = request.POST.get('usuario_id')  # Mantido nome do input para não quebrar template atual
        acao = request.POST.get('btn_gerenciar_solicitacao') 
        
        obra = get_object_or_404(ObraAutor, id=obra_id)
        
        if acao == 'aprovar':
            obra.status = 'aprovado'
            obra.save()
            
            # Vincula o tipo 'autor' ao perfil do usuário dono do e-mail/envio se ele existir
            Usuario.objects.filter(email=obra.email).update(tipo='autor')
            messages.success(request, f"A obra '{obra.titulo}' foi aprovada e o usuário promovido a Autor!")
        elif acao == 'rejeitar':
            obra.status = 'rejeitado'
            obra.save()
            messages.warning(request, f"A solicitação da obra '{obra.titulo}' foi recusada.")
            
        return redirect('dashboard:painel_admin')

    # --- CRUD DE LIVROS ---
    # CREATE (C)
# CREATE (C)
    if request.method == 'POST' and 'btn_add_livro' in request.POST:
        nome_livro = request.POST.get('titulo')
        categoria_id = request.POST.get('categoria')  
        autor_livro = request.POST.get('autor', 'Desconhecido')
        
        # Captura dos arquivos enviados
        arquivo_capa = request.FILES.get('capa')
        arquivo_pdf = request.FILES.get('pdf')

        # Validação Arquitetural Obrigatória: Título, Categoria, Capa E PDF precisam existir
        if not (nome_livro and categoria_id and arquivo_capa and arquivo_pdf):
            messages.error(request, "Erro: OBRIGATÓRIO enviar o título, categoria, imagem de capa e o arquivo PDF do livro.")
            return redirect('dashboard:painel_admin')

        try:
            cat_instancia = get_object_or_404(Categoria, id_categoria=categoria_id)
            
            # Inicializa o gerenciador de arquivos do Django
            fs = FileSystemStorage()
            
            # Salva os arquivos fisicamente no diretório de mídias/estáticos
            nome_arquivo_capa = fs.save(f"capas/{arquivo_capa.name}", arquivo_capa)
            nome_arquivo_pdf = fs.save(f"livros/{arquivo_pdf.name}", arquivo_pdf)
            
            # Recupera a URL/Caminho que o banco espera armazenar
            url_capa = fs.url(nome_arquivo_capa)
            url_pdf = fs.url(nome_arquivo_pdf)

            Livro.objects.create(
                nome=nome_livro,
                categoria=cat_instancia,
                genero=cat_instancia.nome,  
                autor=autor_livro,
                capa=url_capa,         # Salva o caminho gerado da imagem
                pdf=url_pdf,           # Salva o caminho gerado do PDF
                data_publicacao='2026',
                avaliacao='0',
                isbn='0000000000'
            )
            messages.success(request, "Livro e arquivos cadastrados com sucesso!")
        except Exception as e:
            messages.error(request, f"Erro interno ao processar o upload: {str(e)}")
            
        return redirect('dashboard:painel_admin')

    # DELETE (D)
    elif request.method == 'POST' and 'btn_deletar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')
        if livro_id:
            Livro.objects.filter(id_livro=livro_id).delete()
            messages.success(request, "Livro removido com sucesso!")
        return redirect('dashboard:painel_admin')

    # UPDATE (U)
    elif request.method == 'POST' and 'btn_editar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')
        novo_nome = request.POST.get('titulo')
        categoria_id = request.POST.get('categoria')

        if livro_id and novo_nome and categoria_id:
            cat_instancia = get_object_or_404(Categoria, id_categoria=categoria_id)
            Livro.objects.filter(id_livro=livro_id).update(
                nome=novo_nome,
                categoria=cat_instancia,
                genero=cat_instancia.nome
            )
            messages.success(request, "Livro atualizado com sucesso!")
        return redirect('dashboard:painel_admin')

    # --- COLETA DE DADOS & MÉTRICAS ESTATÍSTICAS ---
    todos_livros = Livro.objects.all().select_related('categoria')
    todos_usuarios = Usuario.objects.all().select_related('user_auth')
    todas_categorias = Categoria.objects.all()
    
    # Fila real de solicitações vinda do modelo de envio de obras
    solicitacoes_pendentes = ObraAutor.objects.filter(status='pendente').select_related('categoria')

    # Métricas para os Cards do Dashboard
    total_usuarios = todos_usuarios.count()
    total_livros = todos_livros.count()
    total_autores = todos_usuarios.filter(tipo='autor').count()
    obras_aprovadas = ObraAutor.objects.filter(status='aprovado').count()
    obras_pendentes = solicitacoes_pendentes.count()
    obras_rejeitadas = ObraAutor.objects.filter(status='rejeitado').count()

    contexto = {
        'livros': todos_livros,
        'categorias': todas_categorias,
        'usuarios': todos_usuarios,
        'solicitacoes': solicitacoes_pendentes,
        
        # Estatísticas injetadas no contexto
        'total_usuarios': total_usuarios,
        'total_livros': total_livros,
        'total_autores': total_autores,
        'obras_aprovadas': obras_aprovadas,
        'obras_pendentes': obras_pendentes,
        'obras_rejeitadas': obras_rejeitadas,
    }

    return render(request, 'dashboard/admin.html', contexto)