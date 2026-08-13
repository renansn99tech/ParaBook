import json
import logging
from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.db.models import Count, Avg
from django.db import transaction
from django.core.paginator import Paginator
from django.http import Http404
from django.conf import settings
from django.utils.crypto import salted_hmac

from comunidades.models import Comunidade
from usuarios.models import Usuario
from assinaturas.decorators import requer_premium
from .models import Categoria, Livro, Biblioteca, Denuncia, SolicitacaoPublicacao, DeclaracaoAutoria
from .forms import ObraAutorForm
from .querysets import livros_por_categorias, livros_independentes
from .constants import StatusBiblioteca

# Importação da camada de serviço da Gamificação
from gamificacao.services import GamificacaoService

logger = logging.getLogger(__name__)


def novidade(request):
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
        limite_livros = 10
        is_ilimitado = False

        if hasattr(request.user, 'assinatura') and request.user.assinatura.ativa and request.user.assinatura.plano:
            plano = request.user.assinatura.plano
            if plano.limite_livros == 0:
                is_ilimitado = True
            else:
                limite_livros = plano.limite_livros

        with transaction.atomic():
            # Bloqueia a linha do usuário nativo (User) para evitar que 2 threads passem o limite
            request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
            total_atual = Biblioteca.objects.filter(user=request.user).count()

            if not is_ilimitado and total_atual >= limite_livros:
                messages.warning(
                    request,
                    f"Você atingiu o limite de {limite_livros} livros do seu plano atual. "
                    "Assine o ParaBook Premium para ter uma biblioteca ilimitada!"
                )
                return redirect('assinaturas:listar_planos')

            livro = get_object_or_404(Livro, pk=livro_id, status='publicado')
            obj, criado = Biblioteca.objects.get_or_create(user=request.user, livro=livro)

            if not obj.xp_ganho_adicao:
                obj.xp_ganho_adicao = True
                obj.save(update_fields=['xp_ganho_adicao'])
                # --- GATILHO DE GAMIFICAÇÃO: ADICIONAR LIVRO ---
                try:
                    res_xp = GamificacaoService.adicionar_xp(request.user, 10)
                    msg_extra = ""
                    if res_xp and res_xp.get('subiu_nivel'):
                        msg_extra = f" Você subiu para o Nível {res_xp['nivel_atual']}!"
                    messages.success(request, f"Livro adicionado com sucesso! (+10 XP){msg_extra}")
                except Exception as e:
                    logger.error(f"Erro na gamificação ao adicionar livro {livro_id} para {request.user}: {str(e)}")
                    messages.success(request, "Livro adicionado com sucesso!")
            elif criado:
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

    livro = get_object_or_404(Livro, pk=livro_id, status='publicado')
    return render(request, 'biblioteca/leitura.html', {'livro': livro})


@login_required
def iniciar_leitura(request, livro_id):
    registro_biblioteca = get_object_or_404(Biblioteca, user=request.user, livro_id=livro_id)
    status_anterior = registro_biblioteca.status
    
    registro_biblioteca.status = StatusBiblioteca.LENDO
    registro_biblioteca.save(update_fields=['status'])

    # --- GATILHO DE GAMIFICAÇÃO: INICIAR LEITURA ---
    if status_anterior != StatusBiblioteca.LENDO:
        try:
            GamificacaoService.atualizar_streak(request.user)
        except Exception as e:
            logger.error(f"Erro na gamificação ao iniciar leitura do livro {livro_id} para {request.user}: {str(e)}")

    url_leitura = reverse('leitura')
    return redirect(f"{url_leitura}?id={livro_id}")


def concluir_leitura(request, livro_id):
    if request.method == "POST" and request.user.is_authenticated:
        try:
            registro = Biblioteca.objects.get(user=request.user, livro__id=livro_id)
            status_anterior = registro.status

            registro.status = StatusBiblioteca.LIDO
            registro.save(update_fields=['status'])

            msg_adicional = ""
            subiu_nivel = False
            nivel_atual = None

            # --- GATILHO DE GAMIFICAÇÃO: CONCLUIR LEITURA ---
            if status_anterior != StatusBiblioteca.LIDO and not registro.xp_ganho_leitura:
                registro.xp_ganho_leitura = True
                registro.save(update_fields=['xp_ganho_leitura'])
                try:
                    GamificacaoService.atualizar_streak(request.user)
                    res_xp = GamificacaoService.adicionar_xp(request.user, 100)
                    conquista = GamificacaoService.conceder_conquista(request.user, 'primeira_leitura_concluida')

                    if res_xp and res_xp.get('subiu_nivel'):
                        subiu_nivel = True
                        nivel_atual = res_xp.get('nivel_atual')
                        msg_adicional += f" Você subiu para o Nível {nivel_atual}!"

                    if conquista:
                        msg_adicional += f" Conquista desbloqueada: {conquista.nome}!"
                except Exception as e:
                    logger.error(f"Erro ao processar gamificação na leitura do livro {livro_id} para {request.user}: {str(e)}")

            return JsonResponse({
                "success": True,
                "message": f"Status atualizado para Lido!{msg_adicional}",
                "subiu_nivel": subiu_nivel,
                "nivel_atual": nivel_atual
            })
        except Biblioteca.DoesNotExist:
            return JsonResponse({"success": False, "error": "Livro não encontrado na sua biblioteca."}, status=404)
    return JsonResponse({"success": False, "error": "Requisição inválida."}, status=400)


def is_approved_author(user):
    if user.is_anonymous:
        return False
    if user.is_superuser or user.is_staff:
        return True

    perfil_custom = getattr(user, 'perfil_customizado', None)
    if perfil_custom and getattr(perfil_custom, 'tipo', None) in ['autor', 'admin']:
        return True

    perfil_biblioteca = getattr(user, 'perfil_da_biblioteca', None)
    if perfil_biblioteca:
        status_biblio = getattr(perfil_biblioteca, 'status', None)
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
            with transaction.atomic():
                livro = form.save(commit=False)
                livro.autor = request.user.get_full_name() or request.user.username
                livro.origem = "autor_independente"
                livro.status = "pendente"
                livro.save()

                solicitacao = SolicitacaoPublicacao.objects.create(
                    usuario=request.user,
                    livro=livro,
                    status="pendente"
                )
                cpf = ''.join(filter(str.isdigit, form.cleaned_data['cpf_autor']))
                DeclaracaoAutoria.objects.create(
                    solicitacao=solicitacao,
                    cpf_digest=salted_hmac('parabook.declaracao.cpf', cpf).hexdigest(),
                    cpf_final=cpf[-4:],
                    registro_autoral=form.cleaned_data.get('registro_autoral', ''),
                    numero_registro=form.cleaned_data.get('numero_registro', ''),
                    versao_termos=settings.TERMS_VERSION,
                    ip_origem=request.META.get('REMOTE_ADDR'),
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


def home(request):
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

    autores_query = (
        Livro.objects.filter(status='publicado')
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
            
            nota_anterior = registro.nota
            registro.nota = nova_nota
            registro.save(update_fields=['nota'])

            # --- GATILHO DE GAMIFICAÇÃO: AVALIAR POR ESTRELAS ---
            if nota_anterior is None and not registro.xp_ganho_avaliacao:
                registro.xp_ganho_avaliacao = True
                registro.save(update_fields=['xp_ganho_avaliacao'])
                try:
                    GamificacaoService.adicionar_xp(request.user, 30)
                    GamificacaoService.conceder_conquista(request.user, 'primeira_avaliacao')
                except Exception as e:
                    logger.error(f"Erro na gamificação ao avaliar livro {livro_id} para {request.user}: {str(e)}")

            return JsonResponse({"success": True, "message": f"Avaliado com {nova_nota} estrelas!"})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    return JsonResponse({"success": False}, status=400)


@login_required
def favoritar_livro(request, livro_id):
    if request.method == "POST" and request.user.is_authenticated:
        try:
            registro = Biblioteca.objects.get(user=request.user, livro__id=livro_id)
            estava_favoritado = registro.favorito
            registro.favorito = not registro.favorito
            registro.save(update_fields=['favorito'])

            # --- GATILHO DE GAMIFICAÇÃO: FAVORITAR ---
            if not estava_favoritado and registro.favorito and not registro.xp_ganho_favorito:
                registro.xp_ganho_favorito = True
                registro.save(update_fields=['xp_ganho_favorito'])
                try:
                    GamificacaoService.adicionar_xp(request.user, 5)
                except Exception as e:
                    logger.error(f"Erro na gamificação ao favoritar livro {livro_id} para {request.user}: {str(e)}")

            return JsonResponse({"success": True, "is_favorito": registro.favorito})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    return JsonResponse({"success": False}, status=400)


def livro_info(request, id):
    livro = get_object_or_404(Livro, id=id, status='publicado')

    if request.method == 'POST' and request.user.is_authenticated:
        if 'btn_avaliar' in request.POST:
            nota = request.POST.get('nota')
            resenha = request.POST.get('resenha')

            registro, created = Biblioteca.objects.get_or_create(user=request.user, livro=livro)
            ja_tinha_resenha = bool(registro.resenha)

            registro.nota = nota
            registro.resenha = resenha
            registro.save()

            # --- GATILHO DE GAMIFICAÇÃO: PUBLICAR RESENHA ---
            msg_extra = ""
            if not ja_tinha_resenha and resenha and not registro.xp_ganho_resenha:
                registro.xp_ganho_resenha = True
                registro.save(update_fields=['xp_ganho_resenha'])
                try:
                    res_xp = GamificacaoService.adicionar_xp(request.user, 50)
                    conquista = GamificacaoService.conceder_conquista(request.user, 'primeira_avaliacao')

                    if res_xp and res_xp.get('subiu_nivel'):
                        msg_extra += f" Você subiu para o Nível {res_xp['nivel_atual']}!"
                    if conquista:
                        msg_extra += f" Conquista desbloqueada: {conquista.nome}!"
                except Exception as e:
                    logger.error(f"Erro na gamificação ao publicar resenha do livro {id} para {request.user}: {str(e)}")

            messages.success(request, f"Sua avaliação foi publicada!{msg_extra}")

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
    livro = get_object_or_404(Livro, id=id)
    try:
        data = json.loads(request.body)
        motivo = data.get('motivo', '').strip()

        if not motivo:
            return JsonResponse({'success': False, 'error': 'O motivo da denúncia não pode estar vazio.'}, status=400)

        Denuncia.objects.create(
            livro=livro,
            usuario=request.user,
            motivo=motivo
        )
        return JsonResponse({'success': True, 'message': 'Denúncia registrada com sucesso.'})
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Payload JSON inválido.'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
def criar_livro(request):
    raise Http404("Funcionalidade em desenvolvimento.")


@login_required
def editar_livro(request, pk):
    raise Http404("Funcionalidade em desenvolvimento.")


@login_required
@requer_premium
def recomendacao_ia_view(request):
    import os
    user = request.user

    livros_estante_ids = list(
        Biblioteca.objects.filter(user=user).values_list('livro_id', flat=True)
    )

    itens_estante = Biblioteca.objects.filter(user=user).select_related('livro__categoria')
    categorias_preferidas_ids = list(
        itens_estante.values_list('livro__categoria_id', flat=True).distinct()
    )
    livros_lidos = [item.livro.titulo for item in itens_estante]

    queryset_base = Livro.objects.filter(status='publicado').exclude(id__in=livros_estante_ids)

    ids_recomendados = []

    if categorias_preferidas_ids:
        ids_recomendados = list(
            queryset_base.filter(categoria_id__in=categorias_preferidas_ids)
            .order_by('-avaliacao', '-id')
            .values_list('id', flat=True)[:8]
        )
        motivo_geral = "Cruzamos seu histórico de leituras para encontrar estas obras perfeitamente alinhadas ao seu perfil!"
    else:
        motivo_geral = "Como sua estante ainda está no início, selecionamos os títulos de maior destaque da nossa comunidade!"

    if len(ids_recomendados) < 8:
        ids_complemento = list(
            queryset_base.exclude(id__in=ids_recomendados)
            .order_by('-avaliacao', '-id')
            .values_list('id', flat=True)[:(12 - len(ids_recomendados))]
        )
        ids_recomendados.extend(ids_complemento)

    livros_queryset = Livro.objects.filter(id__in=ids_recomendados).select_related('categoria')

    livros_map = {l.id: l for l in livros_queryset}
    recomendacoes = [livros_map[lid] for lid in ids_recomendados if lid in livros_map]

    for livro in recomendacoes:
        cat_id = livro.categoria_id if livro.categoria else None
        cat_nome = livro.categoria.nome if livro.categoria else "Geral"

        if cat_id in categorias_preferidas_ids:
            livro.afinidade = 95 if (livro.avaliacao or 0) >= 4.0 else 88
            livro.motivo_card = f"Com base no seu interesse em {cat_nome}"
        elif (livro.avaliacao or 0) >= 4.5:
            livro.afinidade = 92
            livro.motivo_card = "Aclamado pelos leitores do ParaBook"
        else:
            livro.afinidade = 82
            livro.motivo_card = "Destaque do catálogo recomendado para você"

    # INTEGRAÇÃO IA REAL: (Desativada temporariamente por motivo de segurança)
    # gemini_key = os.getenv("GEMINI_API_KEY")
    # if gemini_key:
    #     try:
    #         import google.generativeai as genai
    #         import json
    #         
    #         genai.configure(api_key=gemini_key)
    #         model = genai.GenerativeModel('gemini-1.5-flash')
    #         
    #         nomes_recomendados = ", ".join([livro.titulo for livro in recomendacoes])
    #         nomes_lidos = ", ".join(livros_lidos) if livros_lidos else "nenhum"
    #         
    #         prompt = f"O usuário {user.username} já leu: {nomes_lidos}. Você está recomendando os livros: {nomes_recomendados}. Retorne um JSON estrito contendo os motivos personalizados da recomendação de cada livro, com a chave sendo o ID do livro e o valor uma breve frase (máx 15 palavras) explicando de forma entusiástica por que ele vai gostar, baseado no que ele já leu."
    #         prompt += f" A lista de IDs é: {', '.join([str(l.id) for l in recomendacoes])}. Exemplo: {{\"{recomendacoes[0].id}\": \"Você vai amar esse thriller que tem a mesma pegada misteriosa do seu último livro!\"}}"
    #         
    #         response = model.generate_content(prompt)
    #         texto_json = response.text.strip().replace("```json", "").replace("```", "")
    #         
    #         motivos_ia = json.loads(texto_json)
    #         
    #         for livro in recomendacoes:
    #             if str(livro.id) in motivos_ia:
    #                 livro.motivo_card = motivos_ia[str(livro.id)]
    #                 livro.afinidade = min(100, livro.afinidade + 5)
    #                 
    #         motivo_geral = "✨ Nossa IA analisou sua estante e preparou recomendações personalizadas exclusivas para você!"
    #     except Exception as e:
    #         logger.error(f"Erro na API Gemini: {str(e)}")

    context = {
        'recomendacoes': recomendacoes,
        'motivo_geral': motivo_geral,
    }

    return render(request, 'biblioteca/recomendacoes.html', context)
