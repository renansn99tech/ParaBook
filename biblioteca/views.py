from django.contrib import messages
import json
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from config.settings import AUTH_PASSWORD_VALIDATORS

from .services import livros_por_categoria
from .models import Categoria, Livro, ObraAutor, Biblioteca
from usuarios.models import Usuario
from .forms import ObraAutorForm
from .querysets import livros_por_categorias, livros_independentes
from .constants import StatusBiblioteca
from comunidades.models import Comunidade

from comunidades.models import Comunidade
from django.core.paginator import Paginator
from django.db.models import Count
from django.core.exceptions import PermissionDenied

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
    
@login_required
def iniciar_leitura(request, livro_id):
    # 1. Busca o registro do livro na estante deste usuário específico
    registro_biblioteca = get_object_or_404(Biblioteca, user=request.user, livro_id=livro_id)
    
    # 2. Atualiza o status de 'quero_ler' para 'lendo'
    registro_biblioteca.status = StatusBiblioteca.LENDO
    registro_biblioteca.save()
    
    # 3. Redireciona o usuário para a página de leitura real
    # O reverse pega a url base, e nós concatenamos o ID no formato que sua página espera
    url_leitura = reverse('leitura')
    return redirect(f"{url_leitura}?id={livro_id}")

def concluir_leitura(request, livro_id):
    # Garante que só quem está logado e via método POST possa fazer isso
    if request.method == "POST" and request.user.is_authenticated:
        try:
            # Busca o livro na estante desse usuário específico
            registro = Biblioteca.objects.get(user=request.user, livro_id=livro_id)
            
            # Muda o status para LIDO
            registro.status = StatusBiblioteca.LIDO
            registro.save()
            
            # Devolve uma resposta rápida e silenciosa (JSON) para o Javascript
            return JsonResponse({"success": True, "message": "Status atualizado para Lido!"})
            
        except Biblioteca.DoesNotExist:
            return JsonResponse({"success": False, "error": "Livro não encontrado na biblioteca."}, status=404)

    return JsonResponse({"success": False, "error": "Requisição inválida."}, status=400)

def is_approved_author(user):
    if user.is_anonymous:
        return False
    if user.is_superuser or user.is_staff:
        return True
    
    # Se o usuário possui a nova engrenagem (perfil_customizado),
    # o campo 'tipo' manda de forma estrita e isolada.
    if hasattr(user, 'perfil_customizado'):
        return user.perfil_customizado.tipo in ['autor', 'admin']
    
    # Fallback de compatibilidade apenas para usuários antigos 
    # que ainda não migraram ou não possuem o 'perfil_customizado'
    return hasattr(user, 'perfil') and user.perfil.status == 'aprovado'


@login_required
def obras_autores(request):
    # TRAVA DE SEGURANÇA: Se não for autor aprovado ou admin, impede o carregamento do GET/POST
    if not is_approved_author(request.user):
        messages.error(
            request, 
            "Acesso restrito. Esta página está disponível apenas para autores aprovados e administradores."
        )
        return redirect('biblioteca')  # Redireciona o leitor comum para um local seguro

    # A partir daqui, o usuário é garantidamente um autor aprovado ou administrador
    categorias = Categoria.objects.all()
    is_author_approved = True 

    if request.method == 'POST':
        form = ObraAutorForm(request.POST, request.FILES)

        if form.is_valid():
            obra = ObraAutor.objects.create(
                nome=form.cleaned_data['nome'],
                email=form.cleaned_data['email'],
                titulo=form.cleaned_data['titulo'],
                descricao=form.cleaned_data['descricao'],
                arquivo=form.cleaned_data['arquivo'],
                autor=form.cleaned_data['autor'],
                categoria=form.cleaned_data['categoria'],
            )

            # CORREÇÃO: Removido a atribuição forçada de status='aprovado'
            # Agora a obra será salva com o status padrão 'pendente' do model.
            obra.save()

            messages.success(request, 'Sua obra foi enviada com sucesso! Ela passará por uma avaliação antes de ser publicada.')
            return redirect('obras_autores')

    return render(request, 'biblioteca/obras-autores.html', {
        'categorias': categorias,
        'is_author_approved': is_author_approved
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
    livros_em_alta = Livro.objects.all().order_by('-avaliacao')[:6]
    livros_recentes = Livro.objects.all().order_by('-id_livro')[:6]
    comunidades = Comunidade.objects.all()[:6]

    livro_atual = None
    total_leituras = 0

    if request.user.is_authenticated:
        livro_atual = (
            Biblioteca.objects
            .filter(user=request.user, status='lendo')
            .select_related('livro')
            .order_by('-data_adicao')
            .first()
        )

        total_leituras = Biblioteca.objects.filter(
            user=request.user,
            status='lido'
        ).count()

    return render(request, 'index.html', {
        'livros': livros_em_alta,
        'livros_recentes': livros_recentes,
        'comunidades': comunidades,
        'livro_atual': livro_atual,
        'total_leituras': total_leituras,
    })


def lista_autores(request):
    termo_busca = request.GET.get('busca', '').strip()
    
    # Agrupa por nome de autor cadastrado nos livros
    autores_query = (
        Livro.objects.values('autor')
        .annotate(total_obras=Count('id_livro'))
        .order_by('autor')
    )
    
    if termo_busca:
        autores_query = autores_query.filter(autor__icontains=termo_busca)
        
    # LÓGICA NOVA: Busca os usuários que são autores ou admins na nova arquitetura
    usuarios_autores = Usuario.objects.filter(tipo__in=['autor', 'admin']).select_related('perfil')
    
    # Cria um dicionário vinculando o nome do autor ao seu novo perfil
    perfis_registrados = {
        u.nome.lower().strip(): u.perfil 
        for u in usuarios_autores if u.perfil
    }
    
    autores_list = []
    for item in autores_query:
        nome_autor = item['autor']
        autor_chave = nome_autor.lower().strip()
        
        foto_url = None
        biografia_texto = None
        
        # Se o nome do autor do livro bater com um Usuário Autor registrado no sistema:
        if autor_chave in perfis_registrados:
            perfil_novo = perfis_registrados[autor_chave]
            
            # Tenta pegar a bio do novo model
            biografia_texto = getattr(perfil_novo, 'bio', '')
            
            if perfil_novo.foto:
                # Usa a URL do arquivo de imagem do Django
                try:
                    foto_url = perfil_novo.foto.url
                except ValueError:
                    # Fallback de segurança
                    foto_url = None

        autores_list.append({
            'nome': nome_autor,
            'total_obras': item['total_obras'],
            'biografia': biografia_texto,
            'foto': foto_url
        })
        
    paginator = Paginator(autores_list, 8)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'termo_busca': termo_busca,
    }
    return render(request, 'biblioteca/autores.html', context)

# --- NOVAS FUNÇÕES PARA O LEITOR ---
def avaliar_livro(request, livro_id):
    if request.method == "POST" and request.user.is_authenticated:
        try:
            # O JavaScript vai enviar a nota em formato JSON
            data = json.loads(request.body)
            nova_nota = int(data.get('nota'))
            
            registro = Biblioteca.objects.get(user=request.user, livro_id=livro_id)
            registro.nota = nova_nota
            registro.save()
            
            return JsonResponse({"success": True, "message": f"Avaliado com {nova_nota} estrelas!"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    return JsonResponse({"success": False}, status=400)


def favoritar_livro(request, livro_id):
    if request.method == "POST" and request.user.is_authenticated:
        try:
            registro = Biblioteca.objects.get(user=request.user, livro_id=livro_id)
            registro.favorito = not registro.favorito
            registro.save()
            
            # Garante que estamos devolvendo o estado atualizado
            return JsonResponse({"success": True, "is_favorito": registro.favorito})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    return JsonResponse({"success": False}, status=400)