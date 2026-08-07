# pyrefly: ignore [missing-import]
from rest_framework import generics
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
from perfis.models import Perfil
from .serializers import PerfilSerializer

class PerfilRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = PerfilSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Retorna sempre o perfil do usuário logado (token JWT)
        # O signal provavelmente cria um Perfil ao criar um User, então validamos isso.
        perfil, created = Perfil.objects.get_or_create(usuario=self.request.user)
        return perfil

from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from usuarios.models import Usuario
from usuarios.services import obter_ou_criar_usuario_customizado
from biblioteca.models import Biblioteca, Livro
from comunidades.models import Comunidade

class PerfilPublicoAPIView(APIView):
    def get(self, request, username, *args, **kwargs):
        try:
            dados_usuario = Usuario.objects.get(user_auth__username=username)
        except Usuario.DoesNotExist:
            user_auth_obj = get_object_or_404(Usuario.user_auth.field.related_model, username=username)
            if user_auth_obj.is_superuser:
                perfil, _ = Perfil.objects.get_or_create(usuario=user_auth_obj, defaults={"descricao_perfil": "Administrador do Sistema"})
                dados_usuario, _ = Usuario.objects.get_or_create(
                    user_auth=user_auth_obj, 
                    defaults={"nome": "Super User", "tipo": "admin", "perfil": perfil, "termos_aceitos": True}
                )
            else:
                return Response({"detail": "Não encontrado."}, status=404)

        user_auth_obj = dados_usuario.user_auth

        # O React vai tratar se o username é igual ao user.username logado, mas mandamos um flag caso precise:
        is_owner = request.user.is_authenticated and request.user == user_auth_obj

        perfil_do_usuario = dados_usuario.perfil

        # REGRAS DE TRAVA
        if not (request.user.is_authenticated and request.user.is_superuser):
            if dados_usuario.tipo == 'admin' or user_auth_obj.is_superuser:
                return Response({"erro": "Acesso negado a perfis administrativos.", "status_block": "admin"}, status=403)
            if perfil_do_usuario.perfil_privado:
                return Response({"erro": "Este perfil é privado.", "status_block": "privado"}, status=403)

        meus_livros = Biblioteca.objects.filter(user=user_auth_obj)
        qnt_livros_lidos = meus_livros.filter(status='lido').count()
        qnt_lendo_agora = meus_livros.filter(status='lendo').count()
        qnt_avaliados = meus_livros.filter(nota__isnull=False).count()

        minhas_comunidades = Comunidade.objects.filter(membros=user_auth_obj)
        qnt_comunidades = minhas_comunidades.count()

        top_generos = meus_livros.values('livro__categoria__nome').annotate(total=Count('livro__categoria__nome')).order_by('-total')[:3]
        lista_generos_favoritos = [item['livro__categoria__nome'] for item in top_generos if item['livro__categoria__nome']]

        top_autores = meus_livros.values('livro__autor').annotate(total=Count('livro__autor')).order_by('-total')[:3]
        lista_autores_favoritos = [item['livro__autor'] for item in top_autores if item['livro__autor']]

        ultimo_lido = meus_livros.filter(status='lido').order_by('-id').first()
        historico_livros = meus_livros.filter(status='lido').order_by('-id')[:10]

        return Response({
            "is_owner": is_owner,
            "usuario": {
                "username": user_auth_obj.username,
                "nome": dados_usuario.nome,
                "tipo": dados_usuario.tipo
            },
            "perfil": {
                "foto": perfil_do_usuario.foto.url if perfil_do_usuario.foto else None,
                "bio": perfil_do_usuario.bio,
                "descricao_perfil": perfil_do_usuario.descricao_perfil,
                "localizacao": perfil_do_usuario.localizacao,
                "historico_txt": perfil_do_usuario.historico
            },
            "estatisticas": {
                "total_lidos": qnt_livros_lidos,
                "lendo_agora": qnt_lendo_agora,
                "total_avaliados": qnt_avaliados,
                "total_comunidades": qnt_comunidades
            },
            "favoritos": {
                "generos": lista_generos_favoritos,
                "autores": lista_autores_favoritos
            },
            "ultimo_lido": {
                "titulo": ultimo_lido.livro.titulo if ultimo_lido else None
            },
            "historico": [
                {"id": h.id, "titulo": h.livro.titulo, "data": "Recente"} for h in historico_livros
            ],
            "comunidades": [
                {"id": c.id, "nome": c.nome, "descricao": c.descricao} for c in minhas_comunidades
            ]
        })

class SolicitarAutorAPIView(APIView):
    """Registra o aceite do onboarding e envia o usuario para a fila de aprovacao de autor.

    Mesmas guardas da view legada perfis.views.onboarding_autor: quem ja e autor,
    admin ou tem solicitacao em andamento nao entra na fila de novo.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        usuario_custom = obter_ou_criar_usuario_customizado(request.user)

        if usuario_custom.tipo in ['autor', 'admin', 'aguardando_aprovacao']:
            return Response(
                {"detail": "Você já possui uma solicitação em andamento ou privilégios de publicação."},
                status=409
            )

        usuario_custom.tipo = 'aguardando_aprovacao'
        usuario_custom.save(update_fields=['tipo'])

        return Response({
            "detail": "Sua solicitação para Autor Independente está em análise pela nossa equipe.",
            "tipo": usuario_custom.tipo,
        })


class AutoresListAPIView(APIView):
    def get(self, request, *args, **kwargs):
        autores = Usuario.objects.filter(tipo='autor').select_related('user_auth', 'perfil')
        data = []
        for autor in autores:
            # Conta obras aprovadas deste autor
            total_obras = Livro.objects.filter(
                solicitacao_publicacao__usuario=autor.user_auth,
                status='publicado'
            ).count()
            
            perfil = autor.perfil
            
            data.append({
                "id": autor.id,
                "username": autor.user_auth.username,
                "nome": autor.nome,
                "foto": perfil.foto.url if perfil and perfil.foto else None,
                "biografia": perfil.bio if perfil else "",
                "total_obras": total_obras
            })
        
        # Order by total_obras descending
        data.sort(key=lambda x: x['total_obras'], reverse=True)
        return Response(data)
