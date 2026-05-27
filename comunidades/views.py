from django.shortcuts import render

def comunidades(request):
    return render(request, 'comunidades/comunidade.html')

def acesso_comunidade(request):
    return render(request, 'comunidades/acesso-comunidade.html')

def conteudo_comunidade(request):
    return render(request, 'comunidades/conteudo-comunidade.html')