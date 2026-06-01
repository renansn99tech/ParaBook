from django.shortcuts import render, redirect, get_object_or_404
from .models import Livro

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


def biblioteca(request):
    livros_filosofia = Livro.objects.filter(categoria__nome='filosofia')
    livros_literatura = Livro.objects.filter(categoria__nome='literatura')
    livros_religiosos = Livro.objects.filter(categoria__nome='religiosos')
    livros_exatas = Livro.objects.filter(categoria__nome='exatas')
    livros_infantis = Livro.objects.filter(categoria__nome='infantis')
    livros_independentes = Livro.objects.filter(categoria__nome='independente')

    return render(request, 'biblioteca/biblioteca.html', {
        'livros_filosofia': livros_filosofia,
        'livros_literatura': livros_literatura,
        'livros_religiosos': livros_religiosos,
        'livros_exatas': livros_exatas,
        'livros_infantis': livros_infantis,
        'livros_independentes': livros_independentes,
    })



def obras_autores(request, id=None):
    livro = None

    if id:
        livro = get_object_or_404(Livro, id=id)

    if request.method == 'POST':
        titulo = request.POST.get('titulo')
        nome = request.POST.get('nome')
        email = request.POST.get('email')
        categoria = request.POST.get('categoria')
        descricao = request.POST.get('descricao')
        arquivo = request.FILES.get('arquivo')
        autor = request.POST.get('autor') == 'on'


        if livro:
            livro.titulo = titulo
            livro.nome = nome
            livro.email = email
            livro.categoria = categoria
            livro.descricao = descricao

            if arquivo:
                livro.arquivo = arquivo

            livro.autor = autor
            livro.save()
        else:
            Livro.objects.create(
                titulo=titulo,
                nome=nome,
                email=email,
                categoria=categoria,
                descricao=descricao,
                arquivo=arquivo,
                autor=autor
            )

    return redirect('biblioteca')

    return render(request, 'biblioteca/obras-autores.html', {
        'livro': livro
    
    })

def deletar_livro(request, id):
    livro = get_object_or_404(Livro, id=id)

    if request.method == 'POST':
        livro.delete()
        return redirect('biblioteca')

    return redirect('biblioteca')  # sem tela de confirmação



def acesso_biblioteca(request):
    return render(request, 'biblioteca/acesso-biblioteca.html')


def mais_acessados(request):
    return render(request, 'biblioteca/mais-acessados.html')


def novidade(request):
    return render(request, 'biblioteca/novidade.html')
