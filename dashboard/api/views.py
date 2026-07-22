# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from comunidades.models import Comunidade, DenunciaComunidade
from biblioteca.models import Livro, Perfil, Denuncia, SolicitacaoPublicacao

User = get_user_model()

class EstatisticasDashboardAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        total_usuarios = User.objects.count()
        total_comunidades = Comunidade.objects.count()
        total_livros = Livro.objects.count()

        return Response({
            "estatisticas": {
                "total_usuarios": total_usuarios,
                "total_comunidades": total_comunidades,
                "total_livros": total_livros,
            }
        })

class DashboardUsuariosAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        usuarios = []
        for user in User.objects.all():
            try:
                perfil = user.perfil_da_biblioteca
                foto_url = perfil.foto.url if perfil.foto else None
                status = perfil.status
            except:
                foto_url = None
                status = 'desconhecido'
                
            usuarios.append({
                "id": user.id,
                "username": user.username,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "foto": foto_url,
                "status": status,
            })
        return Response(usuarios)

class DashboardAprovacoesAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        perfis_pendentes = Perfil.objects.filter(status='perfil_pendente').select_related('user')
        solicitacoes_pendentes = SolicitacaoPublicacao.objects.filter(status='pendente').select_related('livro', 'usuario')
        
        lista_perfis = [{
            "id": p.id,
            "username": p.user.username,
            "bio": p.bio,
            "data": "Recente" # mock temporario caso não tenha data
        } for p in perfis_pendentes]

        lista_publicacoes = [{
            "id": s.id,
            "titulo_livro": s.livro.titulo if s.livro else 'Sem Título',
            "autor": s.usuario.username,
            "data_envio": s.data_envio.strftime("%d/%m/%Y %H:%M") if s.data_envio else "",
        } for s in solicitacoes_pendentes]

        return Response({
            "perfis": lista_perfis,
            "publicacoes": lista_publicacoes
        })

class DashboardDenunciasAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        denuncias_livros = Denuncia.objects.filter(arquivada=False).select_related('livro', 'usuario')
        denuncias_comuns = DenunciaComunidade.objects.all().select_related('comunidade', 'usuario') # Assumindo não ter "arquivada" em comum

        lista_dl = [{
            "id": d.id,
            "livro": d.livro.titulo,
            "denunciante": d.usuario.username if d.usuario else 'Anônimo',
            "motivo": d.motivo,
            "status": d.status,
            "data": d.data_denuncia.strftime("%d/%m/%Y")
        } for d in denuncias_livros]

        lista_dc = [{
            "id": c.id,
            "comunidade": c.comunidade.nome,
            "denunciante": c.usuario.username if c.usuario else 'Anônimo',
            "motivo": c.motivo,
            "data": c.data_denuncia.strftime("%d/%m/%Y")
        } for c in denuncias_comuns]

        return Response({
            "livros": lista_dl,
            "comunidades": lista_dc
        })

class DashboardLixeiraAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        agora = timezone.now()
        limite_livros = agora - timedelta(days=7)
        limite_denuncias = agora - timedelta(days=30)

        # Garbage collection silenciosa
        Livro.objects.filter(status='removido', data_remocao__lt=limite_livros).delete()
        Denuncia.objects.filter(arquivada=True, data_arquivamento__lt=limite_denuncias).delete()

        livros_removidos = Livro.objects.filter(status='removido').order_by('-data_remocao')
        denuncias_arquivadas = Denuncia.objects.filter(arquivada=True).select_related('livro').order_by('-data_arquivamento')

        lista_livros = [{
            "id": l.id,
            "titulo": l.titulo,
            "data_remocao": l.data_remocao.strftime("%d/%m/%Y") if l.data_remocao else ""
        } for l in livros_removidos]

        lista_denuncias = [{
            "id": d.id,
            "livro": d.livro.titulo if d.livro else 'Removido',
            "motivo": d.motivo,
            "data_arquivamento": d.data_arquivamento.strftime("%d/%m/%Y") if d.data_arquivamento else ""
        } for d in denuncias_arquivadas]

        return Response({
            "obras": lista_livros,
            "denuncias": lista_denuncias
        })

    def post(self, request, *args, **kwargs):
        acao = request.data.get('acao')
        item_id = request.data.get('item_id')

        if not acao or not item_id:
            return Response({"erro": "Ação ou ID inválidos"}, status=400)

        if acao == 'restaurar_livro':
            try:
                livro = Livro.objects.get(id=item_id)
                livro.status = 'publicado'
                livro.data_remocao = None
                livro.save()
                return Response({"sucesso": f"Livro {livro.titulo} restaurado."})
            except Livro.DoesNotExist:
                return Response({"erro": "Livro não encontrado."}, status=404)

        elif acao == 'excluir_livro_permanente':
            try:
                livro = Livro.objects.get(id=item_id)
                livro.delete()
                return Response({"sucesso": "Livro apagado permanentemente."})
            except Livro.DoesNotExist:
                return Response({"erro": "Livro não encontrado."}, status=404)

        elif acao == 'excluir_denuncia_permanente':
            try:
                denuncia = Denuncia.objects.get(id=item_id)
                denuncia.delete()
                return Response({"sucesso": "Denúncia apagada permanentemente."})
            except Denuncia.DoesNotExist:
                return Response({"erro": "Denúncia não encontrada."}, status=404)

        return Response({"erro": "Ação inválida"}, status=400)
