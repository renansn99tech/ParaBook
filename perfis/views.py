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
    try:
        dados_usuario = Usuario.objects.get(user_auth=request.user)
    except Usuario.DoesNotExist:
        is_admin = request.user.is_superuser
        novo_perfil = Perfil.objects.create(descricao_perfil="Administrador do Sistema" if is_admin else "Novo Leitor")
        dados_usuario = Usuario.objects.create(user_auth=request.user, nome="Super User" if is_admin else request.user.username, tipo='admin' if is_admin else 'leitor', perfil=novo_perfil)

    perfil_do_usuario = dados_usuario.perfil

    if dados_usuario.notificacao_autor:
        dados_usuario.notificacao_autor = False
        dados_usuario.save()
        messages.success(request, "🎉 Parabéns! Sua solicitação foi aprovada e você agora é um Autor Independente no ParaBook!")

    if request.method == 'POST':
        # Salva o estado de privacidade do switch
        perfil_privado_post = request.POST.get('perfil_privado') == 'on'
        perfil_do_usuario.perfil_privado = perfil_privado_post

        username = request.POST.get('username')
        descricao_perfil = request.POST.get('descricao_perfil')
        localizacao = request.POST.get('localizacao')
        bio = request.POST.get('bio')
        historico = request.POST.get('historico')
        nome = request.POST.get('nome')

        if request.POST.get('remover_foto') == 'true':
            if perfil_do_usuario.foto:
                perfil_do_usuario.foto.delete() 

        # ==========================================================
        # PROTEÇÃO CONTRA CAMPOS VAZIOS: Só salva se houver texto real
        # ==========================================================
        if username and username.strip(): 
            user_auth = request.user
            user_auth.username = username.strip()
            user_auth.save()
            
        if descricao_perfil is not None: perfil_do_usuario.descricao_perfil = descricao_perfil
        if localizacao is not None: perfil_do_usuario.localizacao = localizacao
        if bio is not None: perfil_do_usuario.bio = bio
        if historico is not None: perfil_do_usuario.historico = historico
        if 'foto' in request.FILES: perfil_do_usuario.foto = request.FILES['foto']
            
        perfil_do_usuario.save()
        
        # Proteção idêntica para o nome de exibição
        if nome and nome.strip():
            dados_usuario.nome = nome.strip()
            dados_usuario.save()
            request.user.first_name = nome.strip()
            request.user.save()
                
        if not request.headers.get('x-requested-with') == 'XMLHttpRequest' and 'fetch' not in request.path:
            messages.success(request, "Alterações salvas com sucesso!")
            return redirect('perfis:perfil_pessoal')
        
    meus_livros = Biblioteca.objects.filter(user=request.user)
    qnt_lendo_agora = meus_livros.filter(status='lendo').count()
    qnt_livros_lidos = meus_livros.filter(status='lido').count()
    qnt_avaliados = meus_livros.filter(nota__isnull=False).count()

    minhas_comunidades = Comunidade.objects.filter(membros=request.user)
    qnt_comunidades = minhas_comunidades.count()

    top_generos = meus_livros.values('livro__categoria__nome').annotate(total=Count('livro__categoria__nome')).order_by('-total')[:3]
    lista_generos_favoritos = [item['livro__categoria__nome'] for item in top_generos if item['livro__categoria__nome']]

    top_autores = meus_livros.values('livro__autor').annotate(total=Count('livro__autor')).order_by('-total')[:3]
    lista_autores_favoritos = [item['livro__autor'] for item in top_autores if item['livro__autor']]

    livros_favoritos = meus_livros.filter(favorito=True)

    # --- NOVA LÓGICA: Busca o último livro lido para exibir no perfil ---
    ultimo_lido = meus_livros.filter(status='lido').order_by('-id').first()

    contexto = {
        'usuario_custom': dados_usuario, 
        'perfil': perfil_do_usuario,     
        'total_lidos': qnt_livros_lidos,
        'lendo_agora': qnt_lendo_agora,
        'total_avaliados': qnt_avaliados,
        'total_comunidades': qnt_comunidades,
        'minhas_comunidades': minhas_comunidades,
        'generos_favoritos': lista_generos_favoritos,
        'autores_favoritos': lista_autores_favoritos,
        'favoritos': livros_favoritos,
        'ultimo_lido': ultimo_lido,
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

def perfil_publico(request, username_alvo):
    dados_usuario = get_object_or_404(Usuario, user_auth__username=username_alvo)
    user_auth_obj = dados_usuario.user_auth
    
    if request.user.is_authenticated and user_auth_obj == request.user:
        return redirect('perfis:perfil_pessoal')

    perfil_do_usuario = dados_usuario.perfil

    # ==========================================================
    # SISTEMA DE TRAVA SEGURO (REGRAS 2 E 3)
    # ==========================================================
    if not request.user.is_superuser:
        # REGRA 3: Bloqueia acesso a perfis administrativos
        if dados_usuario.tipo == 'admin' or user_auth_obj.is_superuser:
            url_origem = request.META.get('HTTP_REFERER', '/comunidades/')
            divisor = '&' if '?' in url_origem else '?'
            return redirect(f"{url_origem}{divisor}status_block=admin")

        # REGRA 3: Bloqueia acesso a contas privadas
        if perfil_do_usuario.perfil_privado:
            url_origem = request.META.get('HTTP_REFERER', '/comunidades/')
            divisor = '&' if '?' in url_origem else '?'
            return redirect(f"{url_origem}{divisor}status_block=privado")

    # Se passou nas travas ou for Admin (Regra 2), renderiza normalmente:
    meus_livros = Biblioteca.objects.filter(user=user_auth_obj)
    qnt_lendo_agora = meus_livros.filter(status='lendo').count()
    qnt_livros_lidos = meus_livros.filter(status='lido').count()
    qnt_avaliados = meus_livros.filter(nota__isnull=False).count()

    minhas_comunidades = Comunidade.objects.filter(membros=user_auth_obj)
    qnt_comunidades = minhas_comunidades.count()

    top_generos = meus_livros.values('livro__categoria__nome').annotate(total=Count('livro__categoria__nome')).order_by('-total')[:3]
    lista_generos_favoritos = [item['livro__categoria__nome'] for item in top_generos if item['livro__categoria__nome']]

    top_autores = meus_livros.values('livro__autor').annotate(total=Count('livro__autor')).order_by('-total')[:3]
    lista_autores_favoritos = [item['livro__autor'] for item in top_autores if item['livro__autor']]

    livros_favoritos = meus_livros.filter(favorito=True)

    # --- NOVA LÓGICA: Busca o último livro lido do usuário visitado ---
    ultimo_lido = meus_livros.filter(status='lido').order_by('-id').first()

    contexto = {
        'usuario_custom': dados_usuario, 
        'perfil': perfil_do_usuario,     
        'total_lidos': qnt_livros_lidos,
        'lendo_agora': qnt_lendo_agora,
        'total_avaliados': qnt_avaliados,
        'total_comunidades': qnt_comunidades,
        'minhas_comunidades': minhas_comunidades,
        'generos_favoritos': lista_generos_favoritos,
        'autores_favoritos': lista_autores_favoritos,
        'favoritos': livros_favoritos,
        'ultimo_lido': ultimo_lido,
        'is_perfil_publico': True,
    }
    return render(request, 'perfis/perfil_publico.html', contexto)

@login_required
def onboarding_autor(request):
    usuario_custom = request.user.perfil_customizado
    
    # Prevenção: Se ele já for autor ou admin, não tem porquê fazer onboarding
    if usuario_custom.tipo in ['autor', 'admin', 'aguardando_aprovacao']:
        messages.info(request, "Você já possui uma solicitação em andamento ou privilégios de publicação.")
        return redirect('perfis:perfil_pessoal')
        
    if request.method == 'POST':
        # O usuário clicou em "Compreendi e quero ser Autor"
        usuario_custom.tipo = 'aguardando_aprovacao'
        usuario_custom.save()
        
        messages.success(request, 'Sucesso! Sua solicitação para Autor Independente está em análise pela nossa equipe.')
        return redirect('perfis:perfil_pessoal')
        
    return render(request, 'perfis/onboarding_autor.html')