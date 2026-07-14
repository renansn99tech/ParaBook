import PyPDF2

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.contrib.auth.models import User
from usuarios.models import Usuario, Notificacao
from biblioteca.models import Livro, Categoria, SolicitacaoPublicacao, Denuncia
from comunidades.models import Comunidade

def apenas_superuser(user):
    return user.is_authenticated and user.is_superuser

def limpar_id_seguro(valor_id):
    """
    Higieniza o ID recebido do frontend. 
    Se for 'undefined', vazio ou não-numérico, retorna None.
    """
    if not valor_id or str(valor_id).strip().lower() == 'undefined':
        return None
    
    valor_str = str(valor_id).strip()
    if valor_str.isdigit():
        return int(valor_str)
        
    return None

@login_required
@user_passes_test(apenas_superuser, login_url='home', redirect_field_name=None)
def painel_admin(request):
    # ==========================================================
    # PROCESSAMENTO DE COMUNIDADES
    # ==========================================================
    if request.method == 'POST' and 'btn_add_comunidade_sistema' in request.POST:
        nome = request.POST.get('nome')
        descricao = request.POST.get('descricao')
        Comunidade.objects.create(nome=nome, descricao=descricao, criada_por_sistema=True, max_participantes=500)
        messages.success(request, f"Comunidade oficial '{nome}' criada com sucesso!")
        return redirect('dashboard:painel_admin')

    elif request.method == 'POST' and 'btn_toggle_manutencao' in request.POST:
        com_id = limpar_id_seguro(request.POST.get('comunidade_id'))
        comunidade = get_object_or_404(Comunidade, id=com_id)
        comunidade.em_manutencao = not comunidade.em_manutencao
        comunidade.save()
        return redirect('dashboard:painel_admin')

    elif request.method == 'POST' and 'btn_deletar_comunidade' in request.POST:
        com_id = limpar_id_seguro(request.POST.get('comunidade_id'))
        get_object_or_404(Comunidade, id=com_id).delete()
        return redirect('dashboard:painel_admin')

    # ==========================================================
    # 1. GERENCIAMENTO DE USUÁRIOS
    # ==========================================================
    elif request.method == 'POST' and 'btn_gerenciar_usuario' in request.POST:
        usuario_id = limpar_id_seguro(request.POST.get('usuario_id'))
        acao = request.POST.get('btn_gerenciar_usuario')
        usuario = get_object_or_404(Usuario, id=usuario_id)
        if acao == 'aprovar':
            usuario.tipo = 'autor'
            usuario.save()
        elif acao == 'rejeitar':
            usuario.tipo = 'leitor'
            usuario.save()
        return redirect('dashboard:painel_admin')

    # ==========================================================
    # 2. GERENCIAMENTO DE OBRAS PENDENTES
    # ==========================================================
    elif request.method == 'POST' and 'btn_gerenciar_solicitacao' in request.POST:
        solicitacao_id = limpar_id_seguro(request.POST.get('obra_id'))
        acao = request.POST.get('btn_gerenciar_solicitacao')
        obra_pendente = get_object_or_404(ObraAutor, id=solicitacao_id)
        
        if acao == 'aprovar':
            novo_livro = Livro.objects.create(
                titulo=obra_pendente.titulo,
                categoria=obra_pendente.categoria,
                autor=obra_pendente.nome,
                capa=obra_pendente.capa if hasattr(obra_pendente, 'capa') else None,
                pdf=obra_pendente.pdf if hasattr(obra_pendente, 'pdf') else None,
                ano_publicacao=2026 
            )
            obra_pendente.delete()
            messages.success(request, f"Obra '{novo_livro.titulo}' aprovada e publicada com sucesso!")
        elif acao == 'rejeitar':
            titulo_obra = obra_pendente.titulo
            obra_pendente.delete()
            messages.warning(request, f"Submissão da obra '{titulo_obra}' foi recusada.")
            
        return redirect('dashboard:painel_admin')

    # ==========================================================
    # 3. CRUD DE LIVROS (ADICIONAR / EDITAR)
    # ==========================================================
    elif request.method == 'POST' and ('btn_add_livro' in request.POST or 'btn_editar_livro' in request.POST):
        livro_id = limpar_id_seguro(request.POST.get('livro_id'))
        titulo = request.POST.get('titulo')
        categoria_id = limpar_id_seguro(request.POST.get('categoria_id'))
        autor = request.POST.get('autor')
        ano_publicacao = request.POST.get('ano_publicacao')
        capa = request.FILES.get('capa')
        pdf = request.FILES.get('pdf')

        isbn_raw = request.POST.get('isbn')
        isbn = isbn_raw.strip() if isbn_raw and isbn_raw.strip() else None

        edicao_raw = request.POST.get('edicao')
        edicao = edicao_raw.strip() if edicao_raw and edicao_raw.strip() else None

        paginas_raw = request.POST.get('paginas')
        paginas = int(paginas_raw) if paginas_raw and paginas_raw.strip().isdigit() else None

        categoria = get_object_or_404(Categoria, id=categoria_id)

        if livro_id:
            # Fluxo de Edição
            livro = get_object_or_404(Livro, id=livro_id)
            livro.titulo = titulo
            livro.categoria = categoria
            livro.autor = autor
            livro.isbn = isbn
            livro.edicao = edicao
            livro.paginas = paginas
            
            if hasattr(livro, 'ano_publicacao'):
                livro.ano_publicacao = ano_publicacao if ano_publicacao else None
            
            if capa:
                livro.capa = capa
            if pdf:
                livro.pdf = pdf
                
            livro.save()
            messages.success(request, f"Livro '{titulo}' atualizado com sucesso!")
        else:
            # Fluxo de Criação seguro
            dados_criacao = {
                'titulo': titulo,
                'categoria': categoria,
                'autor': autor,
                'capa': capa,
                'pdf': pdf,
                'isbn': isbn,
                'edicao': edicao,
                'paginas': paginas,
            }
            
            if hasattr(Livro, 'ano_publicacao'):
                dados_criacao['ano_publicacao'] = ano_publicacao if ano_publicacao else None

            novo_livro = Livro.objects.create(**dados_criacao)
            messages.success(request, f"Livro '{titulo}' cadastrado com sucesso!")

        return redirect('dashboard:painel_admin')

    # ==========================================================
    # 4. EXCLUSÃO DE LIVROS
    # ==========================================================
    elif request.method == 'POST' and 'btn_deletar_livro' in request.POST:
        livro_id = limpar_id_seguro(request.POST.get('livro_id'))
        livro = get_object_or_404(Livro, id=livro_id)
        titulo_livro = livro.titulo
        livro.delete()
        messages.success(request, f"Livro '{titulo_livro}' excluído com sucesso!")
        return redirect('dashboard:painel_admin')

    # ==========================================================
    # 5. MODERAÇÃO E RESOLUÇÃO DE DENÚNCIAS
    # ==========================================================
    elif request.method == 'POST' and 'btn_resolver_denuncia' in request.POST:
        denuncia_id = limpar_id_seguro(request.POST.get('denuncia_id'))
        acao = request.POST.get('acao')
        denuncia = get_object_or_404(Denuncia, id=denuncia_id)

        if acao == 'remover_obra':
            livro = denuncia.livro
            titulo_livro = livro.titulo
            livro.delete()
            messages.success(request, f"Obra '{titulo_livro}' removida e denúncia resolvida.")
        elif acao == 'falso_positivo':
            denuncia.delete()
            messages.success(request, "Denúncia arquivada como Falso Positivo.")

        return redirect('dashboard:painel_admin')

    # ==========================================================
    # GET: RENDERIZAÇÃO DO PAINEL E COLETA DE MÉTRICAS
    # ==========================================================
    livros = Livro.objects.all().select_related('categoria')
    categorias = Categoria.objects.all()
    usuarios = Usuario.objects.all().select_related('user_auth')
    denuncias_pendentes = Denuncia.objects.all().select_related('livro', 'usuario')
    
    usuarios_pendentes = Usuario.objects.filter(tipo='leitor_solicitou_upgrade') 
    solicitacoes = ObraAutor.objects.all().select_related('categoria') 

    comunidades = Comunidade.objects.all()
    comunidades_sistema = Comunidade.objects.filter(criada_por_sistema=True)
    comunidades_usuarios = Comunidade.objects.filter(criada_por_sistema=False)

    total_usuarios = Usuario.objects.count()
    total_livros = livros.count()
    total_autores = Usuario.objects.filter(tipo='autor').count()
    
    obras_aprovadas = total_livros 
    obras_pendentes = solicitacoes.count()

    context = {
        'livros': livros,
        'categorias': categories,  # Mantendo compatibilidade de contexto histórico se necessário
        'categorias': categorias,
        'usuarios': usuarios,
        'denuncias_pendentes': denuncias_pendentes,
        'usuarios_pendentes': usuarios_pendentes,
        'solicitacoes': solicitacoes,
        
        'comunidades': comunidades,
        'comunidades_sistema': comunidades_sistema,
        'comunidades_usuarios': comunidades_usuarios,
        
        'total_usuarios': total_usuarios,
        'total_livros': total_livros,
        'total_autores': total_autores,
        'obras_aprovadas': obras_aprovadas,
        'obras_pendentes': obras_pendentes,
    }

    return render(request, 'dashboard/admin.html', context)

def surpresa(request):
    return render(request, "dashboard/surpresa.html")

def leitor(request):
    return render(request, "dashboard/leitor.html")