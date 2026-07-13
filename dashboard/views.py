import PyPDF2

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.contrib.auth.models import User
from usuarios.models import Usuario, Notificacao
from biblioteca.models import Livro, Categoria, ObraAutor, Denuncia
from comunidades.models import Comunidade
from django.core.files.storage import FileSystemStorage

def apenas_superuser(user):
    return user.is_authenticated and user.is_superuser

@login_required
@user_passes_test(apenas_superuser, login_url='home', redirect_field_name=None)
def painel_admin(request):

    # ==========================================================
    # NOVO: PROCESSAMENTO DE COMUNIDADES NO DASHBOARD (REQUISITOS 3, 5, 7)
    # ==========================================================
    if request.method == 'POST' and 'btn_add_comunidade_sistema' in request.POST:
        nome = request.POST.get('nome')
        descricao = request.POST.get('descricao')
        
        # Criando como comunidade do sistema oficial com limite de 500 membros
        Comunidade.objects.create(
            nome=nome,
            descricao=descricao,
            criada_por_sistema=True,
            max_participantes=500
        )
        messages.success(request, f"Comunidade oficial '{nome}' criada com sucesso!")
        return redirect('dashboard:painel_admin')

    elif request.method == 'POST' and 'btn_toggle_manutencao' in request.POST:
        com_id = request.POST.get('comunidade_id')
        comunidade = get_object_or_404(Comunidade, id=com_id)
        comunidade.em_manutencao = not comunidade.em_manutencao
        comunidade.save()
        status = "colocada em manutenção" if comunidade.em_manutencao else "reativada"
        messages.info(request, f"A comunidade '{comunidade.nome}' foi {status}.")
        return redirect('dashboard:painel_admin')

    elif request.method == 'POST' and 'btn_deletar_comunidade' in request.POST:
        com_id = request.POST.get('comunidade_id')
        comunidade = get_object_or_404(Comunidade, id=com_id)
        
        comunidade.delete()
        messages.success(request, "A comunidade foi removida definitivamente pelo administrador.")
        return redirect('dashboard:painel_admin')
    
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
    # ==========================================================
    # 3. CRUD DE LIVROS (CORRIGIDO E COMPLETO)
    # ==========================================================
    # Criar Livro
    # ==========================================================
    # 3. CRUD DE LIVROS (AJUSTADO PARA OS CAMPOS REAIS DO MODELO)
    # ==========================================================
    # Criar Livro
  # ==========================================================
    # 3. CRUD DE LIVROS (COMPLETO: ADICIONAR, EDITAR E DELETAR)
    # ==========================================================
    # Criar Livro
    if request.method == 'POST' and 'btn_add_livro' in request.POST:
        nome_livro = request.POST.get('titulo')
        categoria_id = request.POST.get('categoria')  
        autor_livro = request.POST.get('autor', 'Desconhecido')
        isbn_livro = request.POST.get('isbn', '')
        data_pub_livro = request.POST.get('data_publicacao', '2026')
        
        arquivo_capa = request.FILES.get('capa')
        arquivo_pdf = request.FILES.get('pdf')

        if not (nome_livro and categoria_id and arquivo_capa and arquivo_pdf):
            messages.error(request, "Erro: OBRIGATÓRIO enviar o título, categoria, imagem de capa e o arquivo PDF do livro.")
            return redirect('dashboard:painel_admin')

        try:
            cat_instancia = get_object_or_404(Categoria, id_categoria=categoria_id)
            
            # --- NOVO: MOTOR DE LEITURA SILENCIOSA DE PDF ---
            total_paginas = None
            if arquivo_pdf:
                try:
                    leitor_pdf = PyPDF2.PdfReader(arquivo_pdf)
                    total_paginas = len(leitor_pdf.pages)
                    # REBOBINAR: Volta o cursor do arquivo para o início para o Django conseguir salvar a mídia corretamente
                    arquivo_pdf.seek(0)
                except Exception as e:
                    print(f"Aviso: Não foi possível ler as páginas do PDF silenciosamente. Erro: {e}")
            # ------------------------------------------------
            
            fs = FileSystemStorage()
            nome_arquivo_capa = fs.save(f"capas/{arquivo_capa.name}", arquivo_capa)
            nome_arquivo_pdf = fs.save(f"livros/{arquivo_pdf.name}", arquivo_pdf)
            
            url_capa = fs.url(nome_arquivo_capa)
            url_pdf = fs.url(nome_arquivo_pdf)

            Livro.objects.create(
                nome=nome_livro,
                categoria=cat_instancia,
                genero=cat_instancia.nome,  
                autor=autor_livro,
                capa=url_capa,         
                pdf=url_pdf,           
                data_publicacao=data_pub_livro,
                avaliacao='0',
                isbn=isbn_livro,
                paginas=total_paginas # Salvando a leitura exata no banco de dados!
            )
            messages.success(request, "Livro cadastrado com sucesso e metadados extraídos!")
        except Exception as e:
            messages.error(request, f"Erro interno ao processar o upload: {str(e)}")
            
        return redirect('dashboard:painel_admin')

    # Editar Livro
    elif request.method == 'POST' and 'btn_editar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')
        novo_nome = request.POST.get('titulo')
        categoria_id = request.POST.get('categoria')
        autor_livro = request.POST.get('autor')
        isbn_livro = request.POST.get('isbn', '')
        data_pub_livro = request.POST.get('data_publicacao', '2026')

        if livro_id and novo_nome and categoria_id:
            try:
                livro = get_object_or_404(Livro, id_livro=livro_id)
                cat_instancia = get_object_or_404(Categoria, id_categoria=categoria_id)
                
                livro.nome = novo_nome
                livro.categoria = cat_instancia
                livro.genero = cat_instancia.nome
                livro.autor = autor_livro
                livro.isbn = isbn_livro
                livro.data_publicacao = data_pub_livro

                fs = FileSystemStorage()
                if request.FILES.get('capa'):
                    arquivo_capa = request.FILES.get('capa')
                    nome_capa = fs.save(f"capas/{arquivo_capa.name}", arquivo_capa)
                    livro.capa = fs.url(nome_capa)
                    
                if request.FILES.get('pdf'):
                    arquivo_pdf = request.FILES.get('pdf')
                    nome_pdf = fs.save(f"livros/{arquivo_pdf.name}", arquivo_pdf)
                    livro.pdf = fs.url(nome_pdf)

                livro.save()
                messages.success(request, "Livro atualizado com sucesso!")
            except Exception as e:
                messages.error(request, f"Erro ao atualizar o livro: {str(e)}")
                
        return redirect('dashboard:painel_admin')

    # Deletar Livro (Adicionado Corretamente)
    elif request.method == 'POST' and 'btn_deletar_livro' in request.POST:
        livro_id = request.POST.get('livro_id')
        if livro_id:
            try:
                livro = get_object_or_404(Livro, id_livro=livro_id)
                livro.delete()
                messages.success(request, "Livro removido com sucesso!")
            except Exception as e:
                messages.error(request, f"Erro ao deletar o livro: {str(e)}")
        else:
            messages.error(request, "Erro: ID do livro não foi enviado pelo formulário.")
            
        return redirect('dashboard:painel_admin')
    
    # ==========================================================
    # NOVO: GERENCIAMENTO DE DENÚNCIAS (MODERAÇÃO)
    # ==========================================================
    elif request.method == 'POST' and 'btn_resolver_denuncia' in request.POST:
        denuncia_id = request.POST.get('denuncia_id')
        acao = request.POST.get('acao')
        denuncia = get_object_or_404(Denuncia, id=denuncia_id)
        
        if acao == 'remover_obra':
            livro_nome = denuncia.livro.nome
            denunciante = denuncia.usuario # Salva quem denunciou antes do banco apagar tudo
            
            # 1. Cria a notificação para o usuário que denunciou
            if denunciante:
                Notificacao.objects.create(
                    usuario=denunciante,
                    titulo="Denúncia Aceita 🛡️",
                    mensagem=f"Sua denúncia sobre '{livro_nome}' foi procedente e a obra foi removida. Obrigado por manter a comunidade segura!"
                )
                
            # 2. Apaga o livro de fato
            denuncia.livro.delete() 
            messages.success(request, f"A obra '{livro_nome}' foi removida com sucesso.")
            
        elif acao == 'falso_positivo':
            denuncia.status = 'analisado'
            denuncia.save()
            
            # Notifica que não havia nada de errado
            if denuncia.usuario:
                Notificacao.objects.create(
                    usuario=denuncia.usuario,
                    titulo="Análise Concluída 🔍",
                    mensagem=f"Avaliamos sua denúncia sobre '{denuncia.livro.nome}', mas não constatamos violações das diretrizes. A denúncia foi arquivada."
                )
            messages.info(request, "Denúncia arquivada como falso positivo.")
            
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

    # BUSCA 3: Denúncias pendentes
    denuncias_pendentes = Denuncia.objects.filter(status='pendente').select_related('livro', 'usuario').order_by('-data_denuncia')

    # ATUALIZAÇÃO DO CONTEXTO DO DASHBOARD: Carrega as listas separadas para as abas
    todas_comunidades = Comunidade.objects.all()
    comunidades_sistema = todas_comunidades.filter(criada_por_sistema=True)
    comunidades_usuarios = todas_comunidades.filter(criada_por_sistema=False)
    
    contexto = {
        'livros': todos_livros,
        'categorias': todas_categorias,
        'usuarios': todos_usuarios,
        'solicitacoes': solicitacoes_pendentes,
        'usuarios_pendentes': usuarios_pendentes,
        'denuncias_pendentes': denuncias_pendentes,
        
        'total_usuarios': todos_usuarios.count(),
        'total_livros': todos_livros.count(),
        'total_autores': todos_usuarios.filter(tipo='autor').count(),
        'obras_aprovadas': ObraAutor.objects.filter(status='aprovado').count(),
        'obras_pendentes': solicitacoes_pendentes.count(),
        'obras_rejeitadas': ObraAutor.objects.filter(status='rejeitado').count(),
        
        # --- NOVOS DADOS DO CONTEXTO ---
        'comunidades': todas_comunidades,
        'comunidades_sistema': comunidades_sistema,
        'comunidades_usuarios': comunidades_usuarios,
    }

    return render(request, 'dashboard/admin.html', contexto)

def surpresa(request):
    return render(request, "dashboard/surpresa.html")

def leitor(request):
    return render(request, "dashboard/leitor.html")