import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.shortcuts import render, redirect, get_object_or_404
from .models import Comunidade, PostagemComunidade, DenunciaComunidade
from usuarios.models import Usuario
from django.contrib import messages
from django.contrib.auth.decorators import login_required

def comunidades(request):
    # Separa as comunidades oficiais (do sistema) das criadas pelos usuários
    comunidades_sistema = Comunidade.objects.filter(criada_por_sistema=True).order_by('nome')
    comunidades_usuarios = Comunidade.objects.filter(criada_por_sistema=False).order_by('-data_criacao')

    return render(request, 'comunidades/comunidade.html', {
        'comunidades_sistema': comunidades_sistema,
        'comunidades_usuarios': comunidades_usuarios
    })

@login_required
def criar_comunidade(request):
    # REGRA 5: Admin não cria salas comuns
    if request.user.is_superuser:
        messages.warning(request, "Administradores criam salas oficiais no Dashboard.")
        return redirect('comunidades')

    # REGRA 10: Limite de 5 comunidades criadas por usuário leitor/autor
    comunidades_do_usuario = Comunidade.objects.filter(criador=request.user).count()
    if comunidades_do_usuario >= 5:
        messages.error(request, "Você atingiu o limite máximo de 5 comunidades criadas.")
        return redirect('comunidades')

    if request.method == 'POST':
        nome = request.POST.get('nome')
        descricao = request.POST.get('descricao')

        nova_comunidade = Comunidade.objects.create(
            nome=nome,
            descricao=descricao,
            criador=request.user, # Define o dono
            max_participantes=200 # Limite padrão de usuário leitor/autor (Regra 9)
        )
        nova_comunidade.membros.add(request.user)
        messages.success(request, f"Comunidade '{nome}' criada com sucesso!")
        return redirect('comunidades')

    return render(request, 'comunidades/criar-comunidade.html')

@login_required
def editar_comunidade(request, id):
    comunidade = get_object_or_404(Comunidade, id=id)
    
    # REGRA 11: Apenas o criador edita
    if comunidade.criador != request.user and not request.user.is_superuser:
        messages.error(request, "Você não tem permissão para editar esta comunidade.")
        return redirect('comunidades')

    if request.method == 'POST':
        comunidade.nome = request.POST.get('nome')
        comunidade.descricao = request.POST.get('descricao')
        comunidade.save()
        messages.success(request, "Alterações salvas!")
        return redirect('comunidades')

    return render(request, 'comunidades/editar-comunidade.html', {'comunidade': comunidade})

@login_required
def excluir_comunidade(request, id):
    comunidade = get_object_or_404(Comunidade, id=id)
    
    # REGRA 11: Apenas o criador pode apagar pelo Front
    if comunidade.criador != request.user and not request.user.is_superuser:
        messages.error(request, "Você não tem permissão para excluir esta comunidade.")
        return redirect('comunidades')

    if request.method == 'POST':
        comunidade.delete()
        messages.success(request, "Comunidade excluída!")
        return redirect('comunidades')

    return render(request, 'comunidades/excluir-comunidade.html', {'comunidade': comunidade})


@login_required
def acesso_comunidade(request):
    # Agora lista APENAS as comunidades onde o usuário é membro
    lista_comunidades = Comunidade.objects.filter(membros=request.user) 
    
    return render(request, 'comunidades/acesso-comunidade.html', {
        'comunidades': lista_comunidades
    })

# NOVA FUNÇÃO: ENTRAR E SAIR DA COMUNIDADE
@login_required
def participar_comunidade(request, id):
    comunidade = get_object_or_404(Comunidade, id=id)
    
    if request.user in comunidade.membros.all():
        comunidade.membros.remove(request.user)
        messages.info(request, f"Você saiu de {comunidade.nome}.")
    else:
        # REGRAS 8 e 9: Respeita a lotação máxima definida
        if comunidade.membros.count() >= comunidade.max_participantes:
            messages.error(request, "Esta comunidade já atingiu a capacidade máxima de participantes.")
            return redirect('comunidades')
            
        comunidade.membros.add(request.user)
        messages.success(request, f"Agora você é membro de {comunidade.nome}!")
        
    return redirect('comunidades')

# Alteração: Buscando a comunidade correta pelo ID recebido via URL
def conteudo_comunidade(request, id):
    comunidade = get_object_or_404(Comunidade, id=id)

    # REGRA 3: Manutenção
    if comunidade.em_manutencao and not request.user.is_superuser:
        return render(request, 'comunidades/empty-state.html', {
            'titulo': "Sala em Manutenção",
            'mensagem': f"A comunidade '{comunidade.nome}' foi temporariamente fechada para ajustes pela equipe técnica."
        })

    # ==========================================================
    # LÓGICA DE PERMISSÃO DE POSTAGEM (Oficina de Autores)
    # ==========================================================
    is_autor_ou_admin = False
    pode_postar = False

    if request.user.is_authenticated:
        pode_postar = True # Por padrão, logados podem postar
        
        # Descobre o nível do usuário
        if request.user.is_superuser:
            is_autor_ou_admin = True
        else:
            try:
                usuario_custom = Usuario.objects.get(user_auth=request.user)
                if usuario_custom.tipo == 'autor':
                    is_autor_ou_admin = True
            except Usuario.DoesNotExist:
                pass
        
        # Se for a comunidade de Autores e o usuário não for Autor/Admin, tira o direito de postar
        if comunidade.nome == "Oficina de Autores" and not is_autor_ou_admin:
            pode_postar = False

    # Validação do envio do formulário (POST)
    if request.method == 'POST':
        # Trava dupla de segurança: Impede o envio via URL/Inspecionar Elemento
        if not pode_postar:
            messages.error(request, "Apenas Autores Independentes podem fazer postagens nesta comunidade.")
            return redirect('conteudo_comunidade', id=comunidade.id)
            
        titulo = request.POST.get('titulo')
        conteudo = request.POST.get('conteudo')
        imagem = request.FILES.get('imagem')

        PostagemComunidade.objects.create(
            comunidade=comunidade,
            autor=request.user,
            titulo=titulo,
            conteudo=conteudo,
            imagem=imagem
        )
        return redirect('conteudo_comunidade', id=comunidade.id)

    posts = PostagemComunidade.objects.filter(comunidade=comunidade).select_related('autor')

    return render(request, 'comunidades/conteudo-comunidade.html', {
        'comunidade': comunidade, 
        'posts': posts,
        'pode_postar': pode_postar # Enviamos a permissão limpa para o HTML decidir o que mostrar!
    })

@login_required
def excluir_postagem(request, id):
    post = get_object_or_404(PostagemComunidade, id=id)
    comunidade_id = post.comunidade.id
    
    # REGRA 6: O autor do post ou qualquer Admin (is_staff/superuser) pode apagar!
    if request.user == post.autor or request.user.is_staff or request.user.is_superuser:
        post.delete()
        messages.success(request, "Postagem removida pela moderação.")
    else:
        messages.error(request, "Ação não autorizada.")
        
    return redirect('conteudo_comunidade', id=comunidade_id)

@login_required
def editar_postagem(request, id):
    post = get_object_or_404(PostagemComunidade, id=id)
    
    # Trava de Segurança: Apenas o dono do post pode editá-lo
    if request.user != post.autor:
        messages.error(request, "Você não tem permissão para editar esta publicação.")
        return redirect('conteudo_comunidade', id=post.comunidade.id)
        
    if request.method == 'POST':
        post.titulo = request.POST.get('titulo')
        post.conteudo = request.POST.get('conteudo')
        
        # Se o usuário enviou uma nova imagem, ela substitui a antiga
        if request.FILES.get('imagem'):
            post.imagem = request.FILES.get('imagem')
            
        post.save()
        messages.success(request, "Postagem atualizada com sucesso!")
        return redirect('conteudo_comunidade', id=post.comunidade.id)
        
    return render(request, 'comunidades/editar-postagem.html', {'post': post})

@login_required
@require_POST
def registrar_denuncia_comunidade(request, id_comunidade):
    try:
        data = json.loads(request.body)
        motivo = data.get('motivo')
        comunidade = get_object_or_404(Comunidade, id=id_comunidade)

        # Regra de Negócio: Evita que o mesmo usuário denuncie a mesma sala 50 vezes
        if not DenunciaComunidade.objects.filter(comunidade=comunidade, usuario=request.user).exists():
            # 1. Salva o registro da denúncia
            DenunciaComunidade.objects.create(
                comunidade=comunidade,
                usuario=request.user,
                motivo=motivo
            )
            
            # 2. Incrementa o contador na model da Comunidade e salva
            comunidade.total_denuncias += 1
            comunidade.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)