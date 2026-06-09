from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from .models import Usuario
from perfis.models import Perfil # Importa a classe Usuario e Perfil das models dos apps


def index(request):
    return render(request, 'index.html')

def mobile_navbar(request):
    return render(request, 'mobile-navbar.html')

def sobre(request):
    return render(request, 'sobre.html')

def leitura(request):
    return render(request, 'usuarios/leitura.html')

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

####### MÉTODO ANTIGO
######################################################################################
# def register(request):
#     if request.method == 'POST':
#         form = UserCreationForm(request.POST)

#         if form.is_valid():
#             user = form.save()
            
#             # opcional: logar automaticamente
#             login(request, user)

#             messages.success(request, 'Conta criada com sucesso!')
#             return redirect('home')

#         else:
#             messages.error(request, 'Erro ao cadastrar usuário')

#     else:
#         form = UserCreationForm()

#     return render(request, 'usuarios/register.html', {'form': form})

######################################################################################

####### NOVO MÉTODO "register" ADAPTADO PARA O CRUD DO APP "perfis":
def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            # 1. Salva o usuário no sistema de autenticação do Django
            auth_user = form.save()
            
            # 2. Cria o Perfil dinamicamente (Operação CREATE do CRUD de perfis)
            novo_perfil = Perfil.objects.create(
                descricao_perfil="Olá! Sou um novo leitor do ParaBook.",
                historico="Nenhum livro lido ainda."
            )
            
            # 3. Cria o Usuário de vocês amarrando tudo
            Usuario.objects.create(
                user_auth=auth_user, # O campo OneToOne que foi criado
                nome=auth_user.username,
                email=auth_user.email,
                perfil=novo_perfil
            )

            login(request, auth_user)
            messages.success(request, 'Conta criada com sucesso!')
            return redirect('perfis:perfil_pessoal') # Redireciona para a página de perfil
    else:
        form = UserCreationForm()
    
    return render(request, 'usuarios/register.html', {'form': form})

def logout_view(request):
    logout(request) # Encerra a sessão do usuário no banco/servidor
    messages.success(request, "Você saiu da sua conta com sucesso.")
    return redirect('home') # Redireciona para a página inicial do ParaBook