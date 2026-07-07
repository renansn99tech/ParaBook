from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.db.models import Count
from usuarios.models import Usuario
from biblioteca.models import Biblioteca
from comunidades.models import Comunidade
from perfis.models import Perfil
from django.contrib.auth.views import PasswordChangeView
from django.contrib.messages.views import SuccessMessageMixin
from django.urls import reverse_lazy

@login_required
def perfil(request):
    # 1. Buscamos ou criamos o usuário em uma única variável (Resolve o aviso do VS Code)
    try:
        dados_usuario = Usuario.objects.get(user_auth=request.user)
    except Usuario.DoesNotExist:
        
        # 2. Proteção Sênior: Verifica se é o Super User real do Django
        is_admin = request.user.is_superuser
        
        novo_perfil = Perfil.objects.create(
            username=request.user.username,
            descricao_perfil="Administrador do Sistema" if is_admin else "Novo Leitor"
        )
        
        dados_usuario = Usuario.objects.create(
            user_auth=request.user,
            nome="Super User" if is_admin else request.user.username,
            email=request.user.email,
            tipo='admin' if is_admin else 'leitor',
            perfil=novo_perfil
        )
        pass
    # 3. A partir daqui, usamos apenas a variável dados_usuario
    perfil_do_usuario = dados_usuario.perfil

    # ==========================================================
    # SISTEMA DE NOTIFICAÇÃO ASSÍNCRONA (Mensagem de Confirmação de Solicitação para Autor)
    # ==========================================================
    if dados_usuario.notificacao_autor:
        dados_usuario.notificacao_autor = False
        dados_usuario.save()
        messages.success(request, "🎉 Parabéns! Sua solicitação foi aprovada e você agora é um Autor Independente no ParaBook!")

    # ==========================================================
    # TRATAMENTO DE FORMULÁRIOS
    # ==========================================================
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
            
        if 'foto' in request.FILES:
            perfil_do_usuario.foto = request.FILES['foto']
            
        perfil_do_usuario.save()
        
        # Só atualiza o nome de exibição se ele veio no formulário
        if nome is not None:
            # 1. Atualiza na sua model customizada
            dados_usuario.nome = nome
            dados_usuario.save()
            
            # 2. Sincroniza com o first_name do User nativo do Django
            request.user.first_name = nome
            request.user.save()
                
        # Garante o redirecionamento correto se for o formulário tradicional
        if not request.headers.get('x-requested-with') == 'XMLHttpRequest' and 'fetch' not in request.path:
            messages.success(request, "Alterações salvas com sucesso!")
            return redirect('perfis:perfil_pessoal')
        
        
    # 1. Buscando os livros do usuário na tabela intermediária da Biblioteca
    meus_livros = Biblioteca.objects.filter(user=request.user)
    
    # Armazenando as contagens reais nas variáveis (Ajuste os valores 'lendo' e 'lido' conforme seu models.py)
    qnt_lendo_agora = meus_livros.filter(status='lendo').count()
    qnt_livros_lidos = meus_livros.filter(status='lido').count()
    qnt_avaliados = meus_livros.filter(nota__isnull=False).count()

    # 2. Buscando a quantidade de comunidades usando a model de forma explícita
    qnt_comunidades = Comunidade.objects.filter(membros=request.user).count()

    # 3. LÓGICA DE FAVORITOS AUTOMÁTICOS (Top 3)
    # Agrupa os livros da biblioteca pelo nome da categoria e conta qual aparece mais
    top_generos = meus_livros.values('livro__categoria__nome') \
        .annotate(total=Count('livro__categoria__nome')) \
        .order_by('-total')[:3]
    
    # Extrai apenas os nomes para uma lista limpa, ignorando valores nulos
    lista_generos_favoritos = [item['livro__categoria__nome'] for item in top_generos if item['livro__categoria__nome']]

    # Faz o mesmo processo para descobrir os autores mais lidos/adicionados
    top_autores = meus_livros.values('livro__autor') \
        .annotate(total=Count('livro__autor')) \
        .order_by('-total')[:3]
        
    lista_autores_favoritos = [item['livro__autor'] for item in top_autores if item['livro__autor']]

    # Filtra apenas os livros marcados como favoritos pelo usuário
    livros_favoritos = meus_livros.filter(favorito=True)

    # 4. O SEU CONTEXTO ATUALIZADO
    contexto = {
        'usuario_custom': dados_usuario, 
        'perfil': perfil_do_usuario,     
        
        'total_lidos': qnt_livros_lidos,
        'lendo_agora': qnt_lendo_agora,
        'total_avaliados': qnt_avaliados,
        'total_comunidades': qnt_comunidades,
        
        # Injetando os dados reais calculados
        'generos_favoritos': lista_generos_favoritos,
        'autores_favoritos': lista_autores_favoritos,
        
        # Histórico e favoritos fixos ficam para depois
        'historico': [],
        'favoritos': livros_favoritos, # Lista vazia substituída por esta variável
    }

    return render(request, 'perfis/perfil.html', contexto)

############################################ FUNÇÃO QUE ENVIA MENSAGEM DE SUCESSO NA ALTERAÇÃO DA SENHA ############################################
class CustomPasswordChangeView(SuccessMessageMixin, PasswordChangeView):
    template_name = 'perfis/alterar_senha.html' # Observe bem o caminho definido!
    success_url = reverse_lazy('perfis:perfil_pessoal')
    success_message = "Sua senha foi alterada com segurança!"
####################################################################################################################################################

@login_required
@require_POST
def virar_autor(request):
    usuario_custom = get_object_or_404(Usuario, user_auth=request.user)
    
    if usuario_custom.tipo == 'leitor':
        usuario_custom.tipo = 'aguardando_aprovacao' # <-- Vai para a fila do admin
        usuario_custom.save()
        messages.success(request, 'Sua solicitação de autor foi enviada com sucesso e está sob análise da moderação!')
    else:
        messages.info(request, 'Você já possui uma solicitação em andamento ou já é um autor.')
        
    return redirect('perfis:perfil_pessoal')

