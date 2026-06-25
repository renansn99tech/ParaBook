from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.views.decorators.http import require_POST
from config.settings import AUTH_PASSWORD_VALIDATORS

from .services import livros_por_categoria
from .models import Categoria, Livro, ObraAutor, Biblioteca
from .forms import ObraAutorForm
from .querysets import livros_por_categorias, livros_independentes

from comunidades.models import Comunidade
from django.shortcuts import render
from django.core.paginator import Paginator
from django.db.models import Count


def novidade(request):
    return render(request, 'biblioteca/novidade.html')

def biblioteca(request):
    categorias = [
    'filosofia',
    'literatura',
    'religiosos',
    'exatas',
    'infantis'
    ]


    livros = livros_por_categorias(categorias)

    livros_map = {cat: [] for cat in categorias}

    for livro in livros:
        livros_map[livro.categoria.nome.lower()].append(livro)

    return render(request, 'biblioteca/biblioteca.html', {
        'livros_filosofia': livros_map['filosofia'],
        'livros_literatura': livros_map['literatura'],
        'livros_religiosos': livros_map['religiosos'],
        'livros_exatas': livros_map['exatas'],
        'livros_infantis': livros_map['infantis'],
        'livros_independentes': livros_independentes(),
    })


@login_required
def adicionar_a_biblioteca(request, livro_id):
    if request.method == 'POST':
        livro = get_object_or_404(Livro, id_livro=livro_id)
        obj, criado = Biblioteca.objects.get_or_create(
            user=request.user,
            livro=livro
        )

    if criado:
            messages.success(request, "Livro adicionado com sucesso!")
    else:
            messages.info(request, "Este livro já está na sua biblioteca.")

    return redirect('acesso_biblioteca')


@login_required
@require_POST
def remover_da_biblioteca(request, livro_id):
    try:
        item = Biblioteca.objects.get(user=request.user, livro_id=livro_id)
        item.delete()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': 'Livro removido com sucesso.'})
            
        # Fallback para caso não seja AJAX (preserva retrocompatibilidade)
        from django.shortcuts import redirect
        return redirect('acesso_biblioteca')
    except Biblioteca.DoesNotExist:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': 'Livro não encontrado na biblioteca.'}, status=404)
        return redirect('acesso_biblioteca')


@login_required
def leitura(request):
    livro_id = request.GET.get('id')


    if not livro_id:
        messages.error(request, "Livro não informado.")
        return redirect('biblioteca')

    try:
        livro_id = int(livro_id)
    except (ValueError, TypeError):
        messages.error(request, "ID inválido.")
        return redirect('biblioteca')

    livro = get_object_or_404(Livro, id_livro=livro_id)

    return render(request, 'biblioteca/leitura.html', {
        'livro': livro
    })


def obras_autores(request):
    categorias = Categoria.objects.all()


    if request.method == 'POST':
        form = ObraAutorForm(request.POST, request.FILES)

        if form.is_valid():
            ObraAutor.objects.create(
                nome=form.cleaned_data['nome'],
                email=form.cleaned_data['email'],
                titulo=form.cleaned_data['titulo'],
                descricao=form.cleaned_data['descricao'],
                arquivo=form.cleaned_data['arquivo'],
                autor=form.cleaned_data['autor'],
                categoria=form.cleaned_data['categoria'],
            )

            messages.success(request, 'Obra enviada para análise!')
            return redirect('biblioteca')

        return render(request, 'biblioteca/obras-autores.html', {
            'categorias': categorias,
            'errors': form.errors
        })

    return render(request, 'biblioteca/obras-autores.html', {
        'categorias': categorias
    })


def listar_obras(request):
    obras = ObraAutor.objects.filter(status='aprovado')


    return render(request, 'biblioteca/lista_obras.html', {
        'obras': obras
    })


def is_admin(user):
    return user.is_superuser or user.is_staff

@login_required
@user_passes_test(is_admin)
def deletar_livro(request, id):
    livro = get_object_or_404(Livro, id_livro=id)


    if request.method == 'POST':
        livro.delete()
        messages.success(request, "Livro removido com sucesso.")
        return redirect('biblioteca')

    return redirect('biblioteca')


@login_required
def acesso_biblioteca(request):
    livros = Biblioteca.objects.filter(
    user=request.user
    ).select_related('livro')


    return render(request, 'biblioteca/acesso-biblioteca.html', {
        'livros': livros
    })


def mais_acessados(request):
    return render(request, 'biblioteca/mais-acessados.html')

def home(request):

    livros = Livro.objects.all()[:6]

    obras_independentes = ObraAutor.objects.filter(
        status='aprovado'
    )[:6]

    comunidades = Comunidade.objects.all()[:6]

    return render(
        request,
        'index.html',
        {
            'livros': livros,
            'obras_independentes': obras_independentes,
            'comunidades': comunidades
        }
    )
    
def lista_autores(request):
    termo_busca = request.GET.get('busca', '').strip()
    
    # Extrai os nomes de autores distintos e conta quantos livros cada um possui
    autores_query = (
        Livro.objects.values('autor')
        .annotate(total_obras=Count('id_livro'))
        .order_by('autor')
    )
    
    # Aplica o filtro de pesquisa por nome do autor caso exista
    if termo_busca:
        autores_query = autores_query.filter(autor__icontains=termo_busca)
        
    # Como o values() retorna dicionários, mapeamos para manter a compatibilidade com o template
    autores_list = []
    for item in autores_query:
        autores_list.append({
            'nome': item['autor'],
            'total_obras': item['total_obras'],
            'biografia': None,  # Como o autor é CharField, não há biografia cadastrada
            'foto': None        # Como o autor é CharField, não há foto de perfil associada
        })
        
    # Paginação: Exibe 8 autores por página
    paginator = Paginator(autores_list, 8)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'termo_busca': termo_busca,
    }
    return render(request, 'biblioteca/autores.html', context)