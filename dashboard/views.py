# dashboard/views.py
from pypdf import PdfReader

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from usuarios.models import Usuario
from biblioteca.models import Livro, Categoria, SolicitacaoPublicacao, Denuncia
from comunidades.models import Comunidade, DenunciaComunidade

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
            usuario.notificacao_autor = True  # NOVO: Dispara a celebração no perfil do usuário!
            usuario.save()
            messages.success(request, f"Upgrade aprovado: {usuario.nome} agora é um Autor Independente!")
            
        elif acao == 'rejeitar':
            usuario.tipo = 'leitor'
            usuario.save()
            messages.warning(request, f"Solicitação de upgrade de {usuario.nome} foi recusada.")
            
        return redirect('dashboard:painel_admin')

    # ==========================================================
    # 2. GERENCIAMENTO DE OBRAS PENDENTES
    # ==========================================================
    elif request.method == 'POST' and 'btn_gerenciar_solicitacao' in request.POST:
        solicitacao_id = limpar_id_seguro(request.POST.get('solicitacao_id'))
        acao = request.POST.get('btn_gerenciar_solicitacao')
        
        # CORREÇÃO SEGURA: Tratamento robusto contra Double Submit (Evita erro 404 se a solicitação já foi processada)
        solicitacao = SolicitacaoPublicacao.objects.filter(id=solicitacao_id).first()
        if not solicitacao:
            return redirect('dashboard:painel_admin')
            
        livro = solicitacao.livro
        
        if acao == 'aprovar':
            # Como o livro já existe no banco, apenas publicamos e removemos a fila pendente
            livro.status = 'publicado'
            livro.save()
            
            solicitacao.delete()
            messages.success(request, f"Obra '{livro.titulo}' aprovada e publicada com sucesso!")
            
        elif acao == 'rejeitar':
            titulo_obra = livro.titulo
            # CORREÇÃO DE CASCADE: Deletar o livro primeiro acionará automaticamente a deleção em cascata (CASCADE) 
            # da SolicitacaoPublicacao correspondente de maneira limpa, atômica e consistente no banco de dados.
            livro.delete()
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

        # --- MOTOR DE LEITURA SILENCIOSA DE PDF ---
        if pdf:
            try:
                leitor_pdf = PdfReader(pdf)
                paginas = len(leitor_pdf.pages)
                pdf.seek(0) # Rebobina o arquivo para o Django conseguir salvar a mídia corretamente
            except Exception as e:
                print(f"Aviso: Não foi possível ler as páginas do PDF: {e}")
        # ------------------------------------------

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
            messages.success(request, f"Livro '{titulo}' updated successfully!")
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
    # 5. MODERAÇÃO E RESOLUÇÃO DE DENÚNCIAS (SOFT DELETE)
    # ==========================================================
    elif request.method == 'POST' and 'btn_resolver_denuncia' in request.POST:
        denuncia_id = limpar_id_seguro(request.POST.get('denuncia_id'))
        acao = request.POST.get('btn_resolver_denuncia')
        denuncia = get_object_or_404(Denuncia, id=denuncia_id)

        if acao == 'remover_obra':
            livro = denuncia.livro
            livro.status = 'removido'
            livro.data_remocao = timezone.now()
            livro.save()
            messages.warning(request, f"Obra '{livro.titulo}' movida para a Lixeira (Retenção: 7 dias).")
        elif acao == 'falso_positivo':
            denuncia.arquivada = True
            denuncia.data_arquivamento = timezone.now()
            denuncia.save()
            messages.info(request, "Denúncia arquivada como Falso Positivo (Retenção: 30 dias).")

    # --- NOVO: RESOLUÇÃO DE DENÚNCIAS DE COMUNIDADES ---
    elif request.method == 'POST' and 'btn_ignorar_denuncia_comunidade' in request.POST:
        dc_id = limpar_id_seguro(request.POST.get('denuncia_comunidade_id'))
        denuncia_com = get_object_or_404(DenunciaComunidade, id=dc_id)
        
        # Opcional, mas recomendado: Limpa o nome da comunidade (subtrai 1 do contador)
        comunidade = denuncia_com.comunidade
        if comunidade.total_denuncias > 0:
            comunidade.total_denuncias -= 1
            comunidade.save()
            
        # Apaga o registro da denúncia falsa do banco de dados
        denuncia_com.delete()
        messages.info(request, "Denúncia da comunidade ignorada com sucesso.")
        
        return redirect('dashboard:painel_admin')

    # ==========================================================
    # GET: RENDERIZAÇÃO DO PAINEL E COLETA DE MÉTRICAS
    # ==========================================================

    # --- NOVO: SEED DE CATEGORIAS AUTOMÁTICO ---
    # Se a tabela de categorias estiver vazia (como após o reset do banco), o Django cria as padrões automaticamente.
    if not Categoria.objects.exists():
        categorias_padrao = ['Filosofia', 'Literatura', 'Religiosos', 'Exatas', 'Infantis', 'Independente']
        for nome_cat in categorias_padrao:
            Categoria.objects.get_or_create(nome=nome_cat)
    # -------------------------------------------
    livros = Livro.objects.all().select_related('categoria')
    categorias = Categoria.objects.all()
    usuarios = Usuario.objects.all().select_related('user_auth')
    denuncias_pendentes = Denuncia.objects.filter(arquivada=False, livro__status='publicado').select_related('livro', 'usuario')
    denuncias_comunidades = DenunciaComunidade.objects.all().select_related('comunidade', 'usuario')  # NOVO: Busca denúncias das comunidades
    
    usuarios_pendentes = Usuario.objects.filter(tipo='aguardando_aprovacao') 
    
    # CORREÇÃO ERRO 4: Coleta de solicitações mapeando através da relação unificada com o Livro
    solicitacoes = SolicitacaoPublicacao.objects.all().select_related('livro__categoria') 

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
        'categorias': categorias,
        'usuarios': usuarios,
        'denuncias_pendentes': denuncias_pendentes,
        'usuarios_pendentes': usuarios_pendentes,
        'solicitacoes': solicitacoes,
        'denuncias_comunidades': denuncias_comunidades,
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

@login_required
@user_passes_test(apenas_superuser, login_url='home', redirect_field_name=None)
def lixeira_admin(request):
    agora = timezone.now()
    limite_livros = agora - timedelta(days=7)
    limite_denuncias = agora - timedelta(days=30)

    # 1. GARBAGE COLLECTION SILENCIOSA (Apaga os vencidos para sempre)
    Livro.objects.filter(status='removido', data_remocao__lt=limite_livros).delete()
    Denuncia.objects.filter(arquivada=True, data_arquivamento__lt=limite_denuncias).delete()

    # 2. AÇÕES DA LIXEIRA (Restaurar ou Excluir Manualmente)
    if request.method == 'POST':
        acao = request.POST.get('acao')
        
        if acao == 'restaurar_livro':
            livro = get_object_or_404(Livro, id=request.POST.get('livro_id'))
            livro.status = 'publicado'
            livro.data_remocao = None
            livro.save()
            messages.success(request, f"A obra '{livro.titulo}' foi restaurada para a biblioteca!")
            
        elif acao == 'excluir_livro_permanente':
            livro = get_object_or_404(Livro, id=request.POST.get('livro_id'))
            livro.delete()
            messages.success(request, "Obra desintegrada permanentemente do banco de dados.")
            
        elif acao == 'excluir_denuncia_permanente':
            denuncia = get_object_or_404(Denuncia, id=request.POST.get('denuncia_id'))
            denuncia.delete()
            messages.success(request, "Denúncia apagada permanentemente do histórico.")
            
        return redirect('dashboard:lixeira')

    # 3. COLETA PARA EXIBIÇÃO
    livros_removidos = Livro.objects.filter(status='removido').order_by('-data_remocao')
    denuncias_arquivadas = Denuncia.objects.filter(arquivada=True).select_related('livro').order_by('-data_arquivamento')

    return render(request, 'dashboard/lixeira.html', {
        'livros_removidos': livros_removidos,
        'denuncias_arquivadas': denuncias_arquivadas,
        'agora': agora
    })
