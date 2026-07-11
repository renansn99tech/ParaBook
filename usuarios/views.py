# usuarios/views.py
from django.db import transaction
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.utils import timezone
from .models import Usuario
from comunidades.models import Comunidade
from biblioteca.models import Livro
from perfis.models import Perfil # Importa a classe Perfil das models do app perfis
from .forms import RegistroUsuarioForm  # <-- Importa o novo formulário customizado


def index(request):
    # Busca os 3 últimos livros adicionados
    livros_recentes = Livro.objects.all().order_by('-id_livro')[:3]
    
    # Busca até 3 Comunidades Oficiais do Sistema
    comunidades_oficiais = Comunidade.objects.filter(criada_por_sistema=True)[:3]
    
    return render(request, 'index.html', {
        'livros_recentes': livros_recentes,
        'comunidades_oficiais': comunidades_oficiais
    })

def mobile_navbar(request):
    return render(request, 'mobile-navbar.html')

def sobre(request):
    return render(request, 'sobre.html')

def diretrizes(request):
    return render(request, 'diretrizes.html')

def backlog(request):
    return render(request, 'backlog.html')

def tela_login(request):
    if request.method == 'POST':
        # Recebe apenas usuário e senha limpos
        usuario_digitado = request.POST.get('username')
        senha_digitada = request.POST.get('password')

        user = authenticate(request, username=usuario_digitado, password=senha_digitada)

        if user is not None:
            login(request, user)
            
            # Aqui a mágica acontece: o login é feito com sucesso, 
            # mas se ele não tiver os termos aceitos no banco, 
            # o Middleware vai "sequestrar" esse redirect e mandar para a tela de Aceite!
            messages.success(request, f'Bem-vindo de volta, {user.username}!')
            return redirect('perfis:perfil_pessoal')
        else:
            messages.error(request, 'Usuário ou senha incorretos.')
            return redirect('usuarios:login')

    return render(request, 'usuarios/tela-login.html')

#####################################################################################
# 2. ATUALIZAÇÃO DA VIEW DE REGISTRO
def register(request):
    if request.method == 'POST':
        form = RegistroUsuarioForm(request.POST)
        if form.is_valid():
            auth_user = form.save(commit=False)
            auth_user.email = form.cleaned_data.get('email').lower()
            nome_completo = form.cleaned_data.get('nome_completo')
            auth_user.first_name = nome_completo
            auth_user.save()
            
            novo_perfil = Perfil.objects.create(descricao_perfil="Olá! Sou um novo leitor do ParaBook.", historico="Nenhum livro lido ainda.")
            
            # ATUALIZAÇÃO AQUI: Registrando o aceite e o timestamp exato da criação
            Usuario.objects.create(
                user_auth=auth_user,
                nome=nome_completo,
                email=auth_user.email,
                perfil=novo_perfil,
                termos_aceitos=True,
                data_aceite_termos=timezone.now()
            )

            login(request, auth_user)
            messages.success(request, 'Conta criada com sucesso! Bem-vindo ao ParaBook.')
            return redirect('perfis:perfil_pessoal')
    else:
        form = RegistroUsuarioForm()
    return render(request, 'usuarios/register.html', {'form': form})
#####################################################################################

def logout_view(request):
    logout(request) # Encerra a sessão do usuário no banco/servidor
    messages.success(request, "Você saiu da sua conta com sucesso.")
    return redirect('home') # Redireciona para a página inicial do ParaBook

@login_required
@require_POST
@transaction.atomic # <-- IMPEDE A FALHA PARCIAL
def excluir_conta(request):
    user = request.user
    
    try:
        usuario_custom = Usuario.objects.get(user_auth=user)
        perfil_vinculado = usuario_custom.perfil
        
        usuario_custom.delete()
        if perfil_vinculado:
            perfil_vinculado.delete()
            
    except Usuario.DoesNotExist:
        pass 

    user.delete() # Se isso falhar, TUDO acima é desfeito automaticamente!
    
    logout(request)
    
    messages.success(request, 'Sua conta foi excluída com sucesso. Esperamos te ver novamente no futuro!')
    
    # Substitua 'home' pela rota que desejar
    return redirect('home')  # Redireciona para a página inicial do ParaBook

@login_required
def aceitar_termos(request):
    if request.method == 'POST':
        usuario_custom = request.user.perfil_customizado
        usuario_custom.termos_aceitos = True
        usuario_custom.data_aceite_termos = timezone.now()
        usuario_custom.save()
        messages.success(request, 'Obrigado por aceitar nossos termos. Bem-vindo de volta!')
        return redirect('perfis:perfil_pessoal')
        
    return render(request, 'usuarios/aceitar_termos.html')