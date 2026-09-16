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
from perfis.services import aplicar_frase_status_padrao_autor

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
            aplicar_frase_status_padrao_autor(usuario)
            messages.success(request, f"Upgrade aprovado: {usuario.nome} agora é um Autor Independente!")
            
        elif acao == 'rejeitar':
            usuario.tipo = 'leitor'
            usuario.save()
            messages.warning(request, f"Solicitação de upgrade de {usuario.nome} foi recusada.")
            
        return redirect('dashboard:painel_admin')

    elif request.method == 'POST' and any(chave in request.POST for chave in (
        'btn_gerenciar_solicitacao', 'btn_add_livro', 'btn_editar_livro',
        'btn_deletar_livro', 'btn_resolver_denuncia',
    )):
        from django.http import JsonResponse
        return JsonResponse({'detail': 'Use o Dashboard React para a publicação e moderação com histórico.'}, status=409)

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
    from django.conf import settings
    from django.http import JsonResponse
    if request.method == 'POST':
        return JsonResponse({'detail': 'Use o Dashboard React; exclusão definitiva não está disponível.'}, status=409)
    return redirect(f"{settings.FRONTEND_URL.rstrip('/')}/dashboard?aba=lixeira")
