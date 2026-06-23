# usuarios/views.py
from django.db import transaction
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib import messages
from .models import Usuario
from perfis.models import Perfil # Importa a classe Perfil das models do app perfis
from .forms import RegistroUsuarioForm  # <-- Importa o novo formulário customizado


def index(request):
    return render(request, 'index.html')

def mobile_navbar(request):
    return render(request, 'mobile-navbar.html')

def sobre(request):
    return render(request, 'sobre.html')

def tela_login(request):
    if request.method == 'POST':
        # Captura o que foi digitado nos inputs com name="username" e name="password"
        usuario_digitado = request.POST.get('username')
        senha_digitada = request.POST.get('password')

        # O Django valida se as credenciais batem com o banco de dados
        user = authenticate(request, username=usuario_digitado, password=senha_digitada)

        if user is not None:
            login(request, user) # Cria a sessão ativa do usuário
            messages.success(request, f'Bem-vindo de volta, {user.username}!')
            return redirect('perfis:perfil_pessoal') # Redireciona para o perfil que refatoramos
        else:
            messages.error(request, 'Usuário ou senha incorretos.')
            return redirect('tela_login')

    # Se for método GET (apenas acessando a página), renderiza a tela limpa
    return render(request, 'usuarios/tela-login.html')

#####################################################################################
def register(request):
    if request.user.is_authenticated:
        return redirect('perfis:perfil_pessoal')

    if request.method == 'POST':
        form = RegistroUsuarioForm(request.POST)
        if form.is_valid():
            # 1. Instancia o usuário sem salvar imediatamente no banco para injetar dados extras
            auth_user = form.save(commit=False)
            auth_user.email = form.cleaned_data.get('email').lower()
            
            # Guardamos o nome completo no first_name do Django por consistência de mercado
            nome_completo = form.cleaned_data.get('nome_completo')
            auth_user.first_name = nome_completo
            auth_user.save() # Salva definitivamente no auth_user
            
            # 2. Cria o Perfil injetando o username
            novo_perfil = Perfil.objects.create(
                username=auth_user.username,
                descricao_perfil="Olá! Sou um novo leitor do ParaBook.",
                historico="Nenhum livro lido ainda."
            )
            
            # 3. Cria o Usuário vinculando os dados limpos e o nome real vindo do formulário
            Usuario.objects.create(
                user_auth=auth_user,
                nome=nome_completo, # <-- Agora o perfil não fica mais com o username feio!
                email=auth_user.email,
                perfil=novo_perfil
            )

            # Efetua o login automático da sessão
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