from django.shortcuts import render

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