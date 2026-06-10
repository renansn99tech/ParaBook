from django.shortcuts import render, redirect, get_object_or_404
from .models import Comunidade


def comunidades(request):
    lista_comunidades = Comunidade.objects.all()

    return render(request, 'comunidades/comunidade.html', {
        'comunidades': lista_comunidades
    })


def criar_comunidade(request):
    if request.method == 'POST':
        nome = request.POST.get('nome')
        descricao = request.POST.get('descricao')

        Comunidade.objects.create(
            nome=nome,
            descricao=descricao
        )

        return redirect('comunidades')

    return render(request, 'comunidades/criar-comunidade.html')


def editar_comunidade(request, id):
    comunidade = get_object_or_404(Comunidade, id=id)

    if request.method == 'POST':
        comunidade.nome = request.POST.get('nome')
        comunidade.descricao = request.POST.get('descricao')
        comunidade.save()

        return redirect('comunidades')

    return render(request, 'comunidades/editar-comunidade.html', {
        'comunidade': comunidade
    })


def excluir_comunidade(request, id):
    comunidade = get_object_or_404(Comunidade, id=id)

    if request.method == 'POST':
        comunidade.delete()
        return redirect('comunidades')

    return render(request, 'comunidades/excluir-comunidade.html', {
        'comunidade': comunidade
    })


def acesso_comunidade(request):
    return render(request, 'comunidades/acesso-comunidade.html')


def conteudo_comunidade(request):
    return render(request, 'comunidades/conteudo-comunidade.html')