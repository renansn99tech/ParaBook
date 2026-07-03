from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.contrib.auth.models import User
from usuarios.models import Usuario
from biblioteca.models import Livro, Categoria, ObraAutor
from django.core.files.storage import FileSystemStorage

def apenas_superuser(user):
    return user.is_authenticated and user.is_superuser

@login_required
@user_passes_test(apenas_superuser, login_url='home', redirect_field_name=None)
def painel_admin(request):
    
    # ==========================================================
    # 1. GERENCIAMENTO DE USUÁRIOS QUE PEDIRAM PARA SER AUTORES
    # ==========================================================
    if request.method == 'POST' and 'btn_gerenciar_usuario' in request.POST:
        usuario_id = request.POST.get('usuario_id')
        acao = request.POST.get('btn_gerenciar_usuario')
        
        usuario = get_object_or_404(Usuario, id=usuario_id)
        
        if acao == 'aprovar':
            usuario.tipo = 'autor'
            usuario.notificacao_autor = True
            usuario.save()
            
            # Automação da Descrição do Perfil
            if hasattr(usuario, 'perfil') and usuario.perfil:
                usuario.perfil.descricao_perfil = "Autor Independente no ParaBook."
                usuario.perfil.save()
                
            messages.success(request, f"O usuário {usuario.nome} agora é um Autor!")
            
        elif acao == 'rejeitar':
            usuario.tipo = 'leitor' # Volta ao status padrão
            usuario.save()
            messages.warning(request, f"A solicitação de {usuario.nome} foi recusada.")
            
        return redirect('dashboard:painel_admin')

    # ==========================================================
    # 2. GERENCIAMENTO DE OBRAS (LIVROS) PENDENTES
    # ==========================================================
    if request.method == 'POST' and 'btn_gerenciar_solicitacao' in request.POST:
        obra_id = request.POST.get('obra_id')  # Ajustado o nome para evitar conflito
        acao = request.POST.get('btn_gerenciar_solicitacao') 
        
        obra = get_object_or_404(ObraAutor, id=obra_id)
        
        if acao == 'aprovar':
            obra.status = 'aprovado'
            obra.save()
            
            # Se o usuário enviou uma obra, ele também vira autor automaticamente
            usuario_qs = Usuario.objects.filter(email=obra.email)
            if usuario_qs.exists():
                usuario = usuario_qs.first()
                usuario.tipo = 'autor'
                usuario.notificacao_autor = True
                usuario.save()
                
                # Automação da Descrição do Perfil
                if hasattr(usuario, 'perfil') and usuario.perfil:
                    usuario.perfil.descricao_perfil = "Autor Independente no ParaBook."
                    usuario.perfil.save()
                    
            messages.success(request, f"A obra '{obra.titulo}' foi aprovada!")
        elif acao == 'rejeitar':
            obra.status = 'rejeitado'
            obra.save()
            messages.warning(request, f"A solicitação da obra '{obra.titulo}' foi recusada.")
            
        return redirect('dashboard:painel_admin')

    # ==========================================================
    # 3. CRUD DE LIVROS (MANTIDO INTACTO)
    # ==========================================================
    # No bloco: if request.method == 'POST' and 'btn_add_livro' in request.POST:
    if request.method == 'POST' and 'btn_add_livro' in request.POST:
        nome_livro = request.POST.get('titulo')
        categoria_id = request.POST.get('categoria')  
        autor_livro = request.POST.get('autor', 'Desconhecido')
        
        # NOVOS CAMPOS CAPTURADOS DO TEMPLATE
        isbn_livro = request.POST.get('isbn', '')
        data_pub_livro = request.POST.get('data_publicacao', '2026')
        num_paginas = request.POST.get('num_paginas', 0)
        editora_livro = request.POST.get('editora', '')
        
        # Captura dos arquivos enviados
        arquivo_capa = request.FILES.get('capa')
        arquivo_pdf = request.FILES.get('pdf')

        if not (nome_livro and categoria_id and arquivo_capa and arquivo_pdf):
            messages.error(request, "Erro: OBRIGATÓRIO enviar o título, categoria, imagem de capa e o arquivo PDF do livro.")
            return redirect('dashboard:painel_admin')

        try:
            cat_instancia = get_object_or_404(Categoria, id_categoria=categoria_id)
            fs = FileSystemStorage()
            
            nome_arquivo_capa = fs.save(f"capas/{arquivo_capa.name}", arquivo_capa)
            nome_arquivo_pdf = fs.save(f"livros/{arquivo_pdf.name}", arquivo_pdf)
            
            url_capa = fs.url(nome_arquivo_capa)
            url_pdf = fs.url(nome_arquivo_pdf)

            # SALVAMENTO DOS DADOS REAIS REPASSADOS
            Livro.objects.create(
                nome=nome_livro,
                categoria=cat_instancia,
                genero=cat_instancia.nome,  
                autor=autor_livro,
                capa=url_capa,         
                pdf=url_pdf,           
                data_publicacao=data_pub_livro,
                num_paginas=num_paginas,  # Caso exista essa coluna na model
                editora=editora_livro,    # Caso exista essa coluna na model
                avaliacao='0',
                isbn=isbn_livro
            )
            messages.success(request, "Livro e arquivos cadastrados com sucesso!")
        except Exception as e:
            messages.error(request, f"Erro interno ao processar o upload: {str(e)}")
            
        return redirect('dashboard:painel_admin')

    # No bloco de UPDATE: elif request.method == 'POST' and 'btn_editar_livro' in request.POST:
    elif request.method == 'POST' and 'btn_editar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')
        novo_nome = request.POST.get('titulo')
        categoria_id = request.POST.get('categoria')
        autor_livro = request.POST.get('autor')
        isbn_livro = request.POST.get('isbn')

        if livro_id and novo_nome and categoria_id:
            cat_instancia = get_object_or_404(Categoria, id_categoria=categoria_id)
        Livro.objects.create(
            nome=nome_livro,
            categoria=cat_instancia,
            genero=cat_instancia.nome,  
            autor=autor_livro,
            capa=url_capa,         
            pdf=url_pdf,           
            data_publicacao=data_pub_livro,  # Este campo já existia como '2026'
            avaliacao='0',
            isbn=isbn_livro                 # Este campo já existia como '0000000000'
        )
        messages.success(request, "Livro e arquivos cadastrados com sucesso!")
        return redirect('dashboard:painel_admin')

    # ==========================================================
    # 4. QUERYS E MÉTRICAS PARA O DASHBOARD (CORREÇÃO AQUI)
    # ==========================================================
    todos_livros = Livro.objects.all().select_related('categoria')
    todos_usuarios = Usuario.objects.all().select_related('user_auth')
    todas_categorias = Categoria.objects.all()
    
    # BUSCA 1: Obras pendentes
    solicitacoes_pendentes = ObraAutor.objects.filter(status='pendente').select_related('categoria')
    
    # BUSCA 2: Usuários que pediram pelo perfil (A CORREÇÃO DA QUERY)
    usuarios_pendentes = Usuario.objects.filter(tipo='aguardando_aprovacao')

    # Métricas
    total_usuarios = todos_usuarios.count()
    total_livros = todos_livros.count()
    total_autores = todos_usuarios.filter(tipo='autor').count()
    obras_aprovadas = ObraAutor.objects.filter(status='aprovado').count()
    obras_pendentes = solicitacoes_pendentes.count()
    obras_rejeitadas = ObraAutor.objects.filter(status='rejeitado').count()
    
    contexto = {
        'livros': todos_livros,
        'categorias': todas_categorias,
        'usuarios': todos_usuarios,
        'solicitacoes': solicitacoes_pendentes,
        'usuarios_pendentes': usuarios_pendentes, # Enviado para o template!
        
        'total_usuarios': total_usuarios,
        'total_livros': total_livros,
        'total_autores': total_autores,
        'obras_aprovadas': obras_aprovadas,
        'obras_pendentes': obras_pendentes,
        'obras_rejeitadas': obras_rejeitadas,
    }

    return render(request, 'dashboard/admin.html', contexto)