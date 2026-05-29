from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages


def index(request):
    return render(request, 'index.html')

def mobile_navbar(request):
    return render(request, 'mobile-navbar.html')

def sobre(request):
    return render(request, 'sobre.html')

def leitura(request):
    return render(request, 'usuarios/leitura.html')

def tela_login(request):
    return render(request, 'usuarios/tela-login.html')

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)

        if form.is_valid():
            user = form.save()
            
            # opcional: logar automaticamente
            login(request, user)

            messages.success(request, 'Conta criada com sucesso!')
            return redirect('home')

        else:
            messages.error(request, 'Erro ao cadastrar usuário')

    else:
        form = UserCreationForm()

    return render(request, 'usuarios/register.html', {'form': form})
