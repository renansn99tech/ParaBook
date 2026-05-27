from django.shortcuts import render

# Create your views here.
def biblioteca(request):
    return render(request, 'biblioteca/biblioteca.html')

def acesso_biblioteca(request):
    return render(request, 'biblioteca/acesso-biblioteca.html')

def mais_acessados(request):
    return render(request, 'biblioteca/mais-acessados.html')

def obras_autores(request):
    return render(request, 'biblioteca/obras-autores.html')

def novidade(request):
    return render(request, 'biblioteca/novidade.html')
