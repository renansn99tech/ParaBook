from django.contrib import messages
from django.shortcuts import render, redirect, get_object_or_404
from .models import Categoria, Livro, ObraAutor, Biblioteca
from django.contrib.auth.decorators import login_required

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
    
    livros_independentes = ObraAutor.objects.filter(status='aprovado',categoria__nome__iexact='independente')



    return render(request, 'biblioteca/biblioteca.html', {
        'livros_filosofia': livros_filosofia,
        'livros_literatura': livros_literatura,
        'livros_religiosos': livros_religiosos,
        'livros_exatas': livros_exatas,
        'livros_infantis': livros_infantis,
        'livros_independentes': livros_independentes,
    })


@login_required
def adicionar_a_biblioteca(request, livro_id):
    livro = get_object_or_404(Livro, id_livro=livro_id)

    Biblioteca.objects.get_or_create(
        user=request.user,
        livro=livro
    )

    return redirect('acesso-biblioteca')

def obras_autores(request):
    categorias = Categoria.objects.all()

    if request.method == 'POST':
        nome = request.POST.get('nome')
        email = request.POST.get('email')
        titulo = request.POST.get('titulo')
        descricao = request.POST.get('descricao')
        arquivo = request.FILES.get('arquivo')
        categoria_id = request.POST.get('categoria')
        autor = request.POST.get('autor') == 'on'

        if arquivo and arquivo.size > 5 * 1024 * 1024:
            return render(request, 'biblioteca/obras-autores.html', {
                'categorias': categorias,
                'erro': 'Arquivo muito grande'
            })

        categoria = Categoria.objects.get(pk=categoria_id)

        ObraAutor.objects.create(
            nome=nome,
            email=email,
            titulo=titulo,
            descricao=descricao,
            arquivo=arquivo,
            autor=autor,
            categoria=categoria
        )

        messages.success(request, 'Obra enviada para análise!')
        return redirect('biblioteca')

    return render(request, 'biblioteca/obras-autores.html', {
        'categorias': categorias
    })


def listar_obras(request):
    obras = ObraAutor.objects.filter(status='aprovado')

    return render(request, 'biblioteca/lista_obras.html', {
        'obras': obras
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
