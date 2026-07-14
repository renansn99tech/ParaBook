from django.contrib import messages
import json
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.db.models import Count, Avg

from comunidades.models import Comunidade

from .models import Categoria, Livro, ObraAutor, Biblioteca, Denuncia
from usuarios.models import Usuario, Notificacao
from .forms import ObraAutorForm
from .querysets import livros_por_categorias, livros_independentes
from .constants import StatusBiblioteca

from django.core.paginator import Paginator

def novidade(request):
    # Alterado para order_by('-id') acompanhando o padrão do framework
    livros_recentes = Livro.objects.all().order_by('-id')[:6]
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
        livro = get_object_or_404(Livro, pk=livro_id)
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

    livro = get_object_or_404(Livro, pk=livro_id)
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
    if user.is_superuser or user.is_staff:
        return True
    if hasattr(user, 'perfil_customizado'):
        return user.perfil_customizado.tipo in ['autor', 'admin']
    return hasattr(user, 'perfil') and user.perfil.status == 'aprovado'

@login_required
def obras_autores(request):
    perfil_customizado = getattr(request.user, 'perfil_customizado', None)
    if not perfil_customizado or perfil_customizado.tipo not in ['autor', 'admin']:
        messages.warning(request, "Acesso negado. Apenas Autores Independentes podem acessar.")
        return redirect('perfis:onboarding_autor')

    categorias = Categoria.objects.all()

    if request.method == 'POST':
        form = ObraAutorForm(request.POST, request.FILES)
        if form.is_valid():
            ObraAutor.objects.create(
                nome=request.user.get_full_name() or request.user.username,
                email=request.user.email,
                titulo=form.cleaned_data['titulo'],
                descricao=form.cleaned_data['descricao'],
                arquivo=form.cleaned_data['arquivo'],
                categoria=form.cleaned_data['categoria'],
                cpf_autor=form.cleaned_data['cpf_autor'],
                isbn=form.cleaned_data['isbn'],
                registro_autoral=form.cleaned_data['registro_autoral'],
                declaracao_autoria=form.cleaned_data['declaracao_autoria'],
                aceitou_termos=form.cleaned_data['aceitou_termos'],
                status='pendente'
            )
            if perfil_customizado:
                perfil_customizado.notificacao_autor = True
                perfil_customizado.save()

            messages.success(request, 'Sua obra foi enviada com sucesso!')
            return redirect('obras_autores')
    else:
        initial_data = {
            'nome': request.user.get_full_name() or request.user.username,
            'email': request.user.email
        }
        form = ObraAutorForm(initial=initial_data)

    return render(request, 'biblioteca/obras-autores.html', {'form': form, 'categorias': categorias})

def listar_obras(request):
    obras = ObraAutor.objects.filter(status='aprovado')
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
    livros_em_alta = Livro.objects.all().order_by('-avaliacao')[:6]
    livros_recentes = Livro.objects.all().order_by('-id')[:6]
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
    
    # Contagem agrupada adaptada para o ID padrão
    autores_query = (
        Livro.objects.values('autor')
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
            if perfil_novo.foto:
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
    livro = get_object_or_404(Livro, id=id)
    
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