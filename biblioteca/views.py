# views.py
import json
from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.db.models import Count, Avg
from django.db import transaction
from django.core.paginator import Paginator
from django.http import Http404 # Garanta que Http404 está importado no topo, se necessário
from comunidades.models import Comunidade
from usuarios.models import Usuario, Notificacao

from .models import Categoria, Livro, Biblioteca, Denuncia, SolicitacaoPublicacao
from .forms import ObraAutorForm
from .querysets import livros_por_categorias, livros_independentes
from .constants import StatusBiblioteca


def novidade(request):
    # Garante que apenas livros aprovados/publicados apareçam na seção de novidades
    livros_recentes = Livro.objects.filter(status='publicado').order_by('-id')[:6]
    return render(request, 'biblioteca/novidade.html', {'livros_recentes': livros_recentes})


def biblioteca(request):
    categorias = ['filosofia', 'literatura', 'religiosos', 'exatas', 'infantis']
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
        # Leitores só devem conseguir adicionar livros que estejam publicados
        livro = get_object_or_404(Livro, pk=livro_id, status='publicado')
        obj, criado = Biblioteca.objects.get_or_create(user=request.user, livro=livro)

        if criado:
            messages.success(request, "Livro adicionado com sucesso!")
        else:
            messages.info(request, "Este livro já está na sua biblioteca.")
    return redirect('acesso_biblioteca')


@login_required
@require_POST
def remover_da_biblioteca(request, livro_id):
    try:
        item = Biblioteca.objects.get(user=request.user, livro__id=livro_id)
        item.delete()
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': 'Livro removido com sucesso.'})
        return redirect('acesso_biblioteca')
    except Biblioteca.DoesNotExist:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': 'Livro não encontrado.'}, status=404)
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

    # Leitores só podem acessar o leitor PDF se o livro estiver publicado
    livro = get_object_or_404(Livro, pk=livro_id, status='publicado')
    return render(request, 'biblioteca/leitura.html', {'livro': livro})


@login_required
def iniciar_leitura(request, livro_id):
    registro_biblioteca = get_object_or_404(Biblioteca, user=request.user, livro_id=livro_id)
    registro_biblioteca.status = StatusBiblioteca.LENDO
    registro_biblioteca.save()
    url_leitura = reverse('leitura')
    return redirect(f"{url_leitura}?id={livro_id}")


def concluir_leitura(request, livro_id):
    if request.method == "POST" and request.user.is_authenticated:
        try:
            registro = Biblioteca.objects.get(user=request.user, livro__id=livro_id)
            registro.status = StatusBiblioteca.LIDO
            registro.save()
            return JsonResponse({"success": True, "message": "Status atualizado para Lido!"})
        except Biblioteca.DoesNotExist:
            return JsonResponse({"success": False, "error": "Livro não encontrado."}, status=404)
    return JsonResponse({"success": False, "error": "Requisição inválida."}, status=400)


def is_approved_author(user):
    if user.is_anonymous:
        return False
    # Admins têm passe livre
    if user.is_superuser or user.is_staff:
        return True
        
    # 1. Checagem principal: O usuário tem o tipo 'autor' no modelo Usuario?
    perfil_custom = getattr(user, 'perfil_customizado', None)
    if perfil_custom and getattr(perfil_custom, 'tipo', None) in ['autor', 'admin']:
        return True
            
    # 2. Checagem de Fallback: Se o tipo não estiver setado, ele foi aprovado via app biblioteca?
    perfil_biblioteca = getattr(user, 'perfil_da_biblioteca', None)
    if perfil_biblioteca:
        status_biblio = getattr(perfil_biblioteca, 'status', None)
        # Verifica as opções exatas definidas em biblioteca.models.Perfil.STATUS_CHOICES
        if status_biblio in ['perfil_aprovado', 'aprovado']: 
            return True
        
    return False


@login_required
def solicitacoes_publicacao(request):
    perfil_customizado = getattr(request.user, 'perfil_customizado', None)
    if not perfil_customizado or perfil_customizado.tipo not in ['autor', 'admin']:
        messages.warning(request, "Acesso negado. Apenas Autores Independentes podem acessar.")
        return redirect('perfis:onboarding_autor')

    categorias = Categoria.objects.all()

    if request.method == 'POST':
        form = ObraAutorForm(request.POST, request.FILES)
        if form.is_valid():
            # Executamos a criação de forma atômica para garantir consistência
            with transaction.atomic():
                # 1. Cria o registro de Livro com dados do formulário
                livro = form.save(commit=False)
                livro.autor = request.user.get_full_name() or request.user.username
                livro.origem = "autor_independente"
                livro.status = "pendente"  # Inicializa pendente de aprovação
                livro.save()

                # 2. Cria o registro associado da Solicitação de Publicação
                SolicitacaoPublicacao.objects.create(
                    usuario=request.user,
                    livro=livro,
                    status="pendente"
                )

                if perfil_customizado:
                    perfil_customizado.notificacao_autor = True
                    perfil_customizado.save()

            messages.success(request, 'Sua obra foi enviada com sucesso para aprovação!')
            return redirect('solicitacoes_publicacao')
    else:
        initial_data = {
            'nome': request.user.get_full_name() or request.user.username,
            'email': request.user.email
        }
        form = ObraAutorForm(initial=initial_data)

    return render(request, 'biblioteca/obras-autores.html', {'form': form, 'categorias': categorias})


def listar_obras(request):
    """Lista todos os livros criados por autores independentes que já foram aprovados."""
    obras = Livro.objects.filter(origem='autor_independente', status='publicado')
    return render(request, 'biblioteca/lista_obras.html', {'obras': obras})


def is_admin(user):
    return user.is_superuser or user.is_staff


@login_required
@user_passes_test(is_admin)
def deletar_livro(request, id):
    livro = get_object_or_404(Livro, id=id)
    if request.method == 'POST':
        livro.delete()
        messages.success(request, "Livro removido com sucesso.")
    return redirect('biblioteca')


@login_required
def acesso_biblioteca(request):
    livros = Biblioteca.objects.filter(user=request.user).select_related('livro')
    return render(request, 'biblioteca/acesso-biblioteca.html', {'livros': livros})


def mais_acessados(request):
    return render(request, 'biblioteca/mais-acessados.html')


def home(request):
    # Apenas livros publicados devem figurar na home (recente e alta)
    livros_em_alta = Livro.objects.filter(status='publicado').order_by('-avaliacao')[:6]
    livros_recentes = Livro.objects.filter(status='publicado').order_by('-id')[:6]
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
        total_leituras = Biblioteca.objects.filter(user=request.user, status='lido').count()

    return render(request, 'index.html', {
        'livros': livros_em_alta,
        'livros_recentes': livros_recentes,
        'comunidades': comunidades,
        'livro_atual': livro_atual,
        'total_leituras': total_leituras,
    })


def lista_autores(request):
    termo_busca = request.GET.get('busca', '').strip()
    
    # Agrupa autores apenas considerando livros que estejam de fato publicados no catálogo
    autores_query = (
        Livro.objects.filter(status='published' if False else 'publicado')
        .values('autor')
        .annotate(total_obras=Count('id'))
        .order_by('autor')
    )
    
    if termo_busca:
        autores_query = autores_query.filter(autor__icontains=termo_busca)
        
    usuarios_autores = Usuario.objects.filter(tipo__in=['autor', 'admin']).select_related('perfil')
    perfis_registrados = {u.nome.lower().strip(): u.perfil for u in usuarios_autores if u.perfil}
    
    autores_list = []
    for item in autores_query:
        nome_autor = item['autor']
        autor_chave = nome_autor.lower().strip()
        foto_url = None
        biografia_texto = None
        
        if autor_chave in perfis_registrados:
            perfil_novo = perfis_registrados[autor_chave]
            biografia_texto = getattr(perfil_novo, 'bio', '')
            if getattr(perfil_novo, 'foto', None) and hasattr(perfil_novo.foto, 'url'):
                try:
                    foto_url = perfil_novo.foto.url
                except ValueError:
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
    
    return render(request, 'biblioteca/autores.html', {'page_obj': page_obj, 'termo_busca': termo_busca})


@login_required
def avaliar_livro(request, livro_id):
    if request.method == "POST" and request.user.is_authenticated:
        try:
            data = json.loads(request.body)
            nova_nota = int(data.get('nota'))
            registro = Biblioteca.objects.get(user=request.user, livro__id=livro_id)
            registro.nota = nova_nota
            registro.save()
            return JsonResponse({"success": True, "message": f"Avaliado com {nova_nota} estrelas!"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    return JsonResponse({"success": False}, status=400)


@login_required
def favoritar_livro(request, livro_id):
    if request.method == "POST" and request.user.is_authenticated:
        try:
            registro = Biblioteca.objects.get(user=request.user, livro__id=livro_id)
            registro.favorito = not registro.favorito
            registro.save()
            return JsonResponse({"success": True, "is_favorito": registro.favorito})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    return JsonResponse({"success": False}, status=400)


def livro_info(request, id):
    # Apenas exibe a página do livro se ele estiver publicado
    livro = get_object_or_404(Livro, id=id, status='publicado')
    
    if request.method == 'POST' and request.user.is_authenticated:
        if 'btn_avaliar' in request.POST:
            nota = request.POST.get('nota')
            resenha = request.POST.get('resenha')
            
            registro, created = Biblioteca.objects.get_or_create(user=request.user, livro=livro)
            registro.nota = nota
            registro.resenha = resenha
            registro.save()
            messages.success(request, "Sua avaliação foi publicada!")
            
        elif 'btn_remover_avaliacao' in request.POST:
            registro = Biblioteca.objects.filter(user=request.user, livro=livro).first()
            if registro:
                registro.nota = None
                registro.resenha = None
                registro.save()
                messages.info(request, "Sua avaliação foi removida.")
        
        media = Biblioteca.objects.filter(livro=livro, nota__isnull=False).aggregate(Avg('nota'))['nota__avg']
        livro.avaliacao = media if media else 0.0
        livro.save()
        
        return redirect('livro_info', id=livro.id)

    avaliacoes = Biblioteca.objects.filter(livro=livro, nota__isnull=False).select_related('user').order_by('-data_adicao')
    minha_avaliacao = None
    if request.user.is_authenticated:
        minha_avaliacao = Biblioteca.objects.filter(livro=livro, user=request.user, nota__isnull=False).first()

    return render(request, 'biblioteca/livro_info.html', {
        'livro': livro,
        'avaliacoes': avaliacoes,
        'minha_avaliacao': minha_avaliacao
    })


@login_required
@require_POST
def registrar_denuncia(request, id):
    try:
        data = json.loads(request.body)
        motivo = data.get('motivo')
        livro = get_object_or_404(Livro, id=id)

        Denuncia.objects.create(livro=livro, usuario=request.user, motivo=motivo)
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    

@login_required
@user_passes_test(is_admin)
def painel_moderacao(request):
    denuncias_pendentes = Denuncia.objects.filter(status='pendente').select_related('livro', 'usuario').order_by('-data_denuncia')
    return render(request, 'biblioteca/painel_moderacao.html', {'denuncias': denuncias_pendentes})


@login_required
@user_passes_test(is_admin)
@require_POST
def resolver_denuncia(request, id_denuncia):
    denuncia = get_object_or_404(Denuncia, id=id_denuncia)
    acao = request.POST.get('acao')
    
    if acao == 'remover_obra':
        livro_nome = denuncia.livro.titulo
        denuncia.livro.delete() 
        messages.success(request, f"A obra '{livro_nome}' foi removida.")
    elif acao == 'falso_positivo':
        denuncia.status = 'analisado'
        denuncia.save()
        messages.info(request, "Denúncia arquivada como falso positivo.")
        
    return redirect('painel_moderacao')

@login_required
def criar_livro(request):
    """
    Assinatura temporária para permitir inicialização do servidor.
    Implementar a lógica de criação de livros posteriormente.
    """
    raise Http404("Funcionalidade em desenvolvimento.")

@login_required
def editar_livro(request, pk):
    """
    Assinatura temporária para permitir inicialização do servidor.
    Implementar a lógica de edição de livros posteriormente.
    """
    raise Http404("Funcionalidade em desenvolvimento.")