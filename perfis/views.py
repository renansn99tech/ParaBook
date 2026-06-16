from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from usuarios.models import Usuario # Importação do app usuários existente
from perfis.models import Perfil

@login_required
def perfil(request):
    # Garante que o Usuario existe
    dados_usuario, created = Usuario.objects.get_or_create(
        user_auth=request.user,
        defaults={
            'nome': request.user.username,
            'email': request.user.email
        }
    )

    # Garante que o Perfil existe
    if not dados_usuario.perfil:
        perfil = Perfil.objects.create(
            descricao_perfil="Perfil criado automaticamente",
            historico=""
        )
        dados_usuario.perfil = perfil
        dados_usuario.save()

    perfil_do_usuario = dados_usuario.perfil

    if request.method == 'POST':
        # U - UPDATE: Capturando e atualizando os dados do Perfil        
        novo_username = request.POST.get('username')
    
        # 1. Atualiza o username do Perfil
        perfil_do_usuario.username = novo_username
        perfil_do_usuario.descricao_perfil = request.POST.get('descricao_perfil')
        perfil_do_usuario.localizacao = request.POST.get('localizacao')
        perfil_do_usuario.bio = request.POST.get('bio')
        perfil_do_usuario.save()
        
        # 2. Atualiza o Nome de Exibição na tabela Usuario
        dados_usuario.nome = request.POST.get('nome')
        dados_usuario.save()
        
        # 3. SINCRONIA: Atualiza o username de autenticação do Django
        # Isso garante que o novo username seja usado no próximo login!
        user_auth = request.user
        user_auth.username = novo_username
        user_auth.save()
        
        # CORREÇÃO: Utilizando o namespace correto definido em urls.py para evitar NoReverseMatch
        return redirect('perfis:perfil_pessoal')

    # Mocking/Valores temporários para o template não quebrar enquanto biblioteca/comunidades não chegam
    contexto = {
        'usuario_custom': dados_usuario,
        'perfil': perfil_do_usuario,
        
        # Estatísticas (Temporariamente zeradas para o front-end renderizar sem erros)
        'total_lidos': 0,
        'lendo_agora': 0,
        'total_avaliados': 0,
        'total_comunidades': 0,
        
        # Listas vazias prontas para o {% empty %} do template
        'generos_favoritos': [],
        'autores_favoritos': [],
        'historico': [],
        'favoritos': []
    }

    return render(request, 'perfis/perfil.html', contexto)


def admin(request):
    return render(request, 'perfis/admin.html')
