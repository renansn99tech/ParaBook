# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from comunidades.models import Comunidade, DenunciaComunidade
from biblioteca.models import Livro, Denuncia, SolicitacaoPublicacao
from usuarios.models import Usuario, AuditoriaAcao
from usuarios.audit import registrar_acao
from notificacoes.models import Notificacao
from dashboard.models import FeatureFlag

User = get_user_model()

class EstatisticasDashboardAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        total_usuarios = User.objects.count()
        total_comunidades = Comunidade.objects.count()
        total_livros = Livro.objects.count()
        aprovacoes_pendentes = (
            Usuario.objects.filter(tipo='aguardando_aprovacao').count()
            + SolicitacaoPublicacao.objects.filter(status='pendente').count()
        )

        return Response({
            "estatisticas": {
                "total_usuarios": total_usuarios,
                "total_comunidades": total_comunidades,
                "total_livros": total_livros,
                "obras_publicadas": Livro.objects.filter(status='publicado').count(),
                "aprovacoes_pendentes": aprovacoes_pendentes,
                "denuncias_abertas": (
                    Denuncia.objects.filter(arquivada=False).count()
                    + DenunciaComunidade.objects.filter(status='pendente').count()
                ),
                "novos_usuarios_hoje": User.objects.filter(
                    date_joined__date=timezone.localdate()
                ).count(),
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
        perfis_pendentes = Usuario.objects.filter(
            tipo='aguardando_aprovacao',
            user_auth__isnull=False,
        ).select_related('user_auth', 'perfil')
        solicitacoes_pendentes = SolicitacaoPublicacao.objects.filter(status='pendente').select_related('livro', 'usuario')
        
        lista_perfis = [{
            "id": p.id,
            "username": p.user_auth.username,
            "bio": p.perfil.bio if p.perfil else '',
            "data": p.user_auth.date_joined,
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
        denuncias_comuns = DenunciaComunidade.objects.filter(status='pendente').select_related('comunidade', 'usuario')

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


class DashboardModeracaoAPIView(APIView):
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request, categoria, item_id, *args, **kwargs):
        acao = request.data.get('acao')
        if acao not in {'aprovar', 'recusar'}:
            return Response({'acao': ['Use aprovar ou recusar.']}, status=400)
        observacao = str(request.data.get('observacao', '')).strip()[:1000]

        if categoria == 'autor':
            usuario = Usuario.objects.select_for_update(of=('self',)).select_related('user_auth').filter(
                pk=item_id,
                tipo='aguardando_aprovacao',
            ).first()
            if not usuario:
                return Response({'detail': 'Solicitação já processada ou inexistente.'}, status=409)
            usuario.tipo = 'autor' if acao == 'aprovar' else 'leitor'
            usuario.notificacao_autor = acao == 'aprovar'
            usuario.save(update_fields=['tipo', 'notificacao_autor'])
            Notificacao.objects.create(
                usuario=usuario.user_auth,
                titulo='Solicitação de autor analisada',
                mensagem=(
                    'Seu perfil de Autor Independente foi aprovado.'
                    if acao == 'aprovar'
                    else f'Sua solicitação não foi aprovada.{" " + observacao if observacao else ""}'
                ),
                tipo='SISTEMA',
                link='/perfil',
            )
            recurso = usuario

        elif categoria == 'publicacao':
            solicitacao = SolicitacaoPublicacao.objects.select_for_update(of=('self',)).select_related('livro', 'usuario').filter(
                pk=item_id,
                status='pendente',
            ).first()
            if not solicitacao:
                return Response({'detail': 'Solicitação já processada ou inexistente.'}, status=409)
            solicitacao.status = 'aprovado' if acao == 'aprovar' else 'rejeitado'
            solicitacao.observacao_admin = observacao
            solicitacao.data_analise = timezone.now()
            solicitacao.save(update_fields=['status', 'observacao_admin', 'data_analise'])
            solicitacao.livro.status = 'publicado' if acao == 'aprovar' else 'rejeitado'
            solicitacao.livro.save(update_fields=['status'])
            Notificacao.objects.create(
                usuario=solicitacao.usuario,
                titulo='Publicação analisada',
                mensagem=f'A obra “{solicitacao.livro.titulo}” foi {"aprovada" if acao == "aprovar" else "recusada"}.',
                tipo='SOLICITACAO',
                link='/perfil',
            )
            recurso = solicitacao

        elif categoria == 'livro':
            denuncia = Denuncia.objects.select_for_update(of=('self',)).select_related('livro').filter(
                pk=item_id,
                arquivada=False,
            ).first()
            if not denuncia:
                return Response({'detail': 'Denúncia já processada ou inexistente.'}, status=409)
            agora = timezone.now()
            denuncia.arquivada = True
            denuncia.data_arquivamento = agora
            denuncia.status = 'removido' if acao == 'aprovar' else 'analisado'
            denuncia.save(update_fields=['arquivada', 'data_arquivamento', 'status'])
            if acao == 'aprovar':
                denuncia.livro.status = 'removido'
                denuncia.livro.data_remocao = agora
                denuncia.livro.save(update_fields=['status', 'data_remocao'])
                Denuncia.objects.filter(
                    livro=denuncia.livro,
                    arquivada=False,
                ).update(arquivada=True, data_arquivamento=agora, status='removido')
            recurso = denuncia

        elif categoria == 'comunidade':
            denuncia = DenunciaComunidade.objects.select_for_update(of=('self',)).select_related('comunidade').filter(
                pk=item_id,
                status='pendente',
            ).first()
            if not denuncia:
                return Response({'detail': 'Denúncia já processada ou inexistente.'}, status=409)
            denuncia.status = 'acolhida' if acao == 'aprovar' else 'arquivada'
            denuncia.data_analise = timezone.now()
            denuncia.save(update_fields=['status', 'data_analise'])
            if acao == 'aprovar':
                denuncia.comunidade.em_manutencao = True
                denuncia.comunidade.save(update_fields=['em_manutencao'])
                DenunciaComunidade.objects.filter(
                    comunidade=denuncia.comunidade,
                    status='pendente',
                ).update(status='acolhida', data_analise=denuncia.data_analise)
            elif denuncia.comunidade.total_denuncias > 0:
                denuncia.comunidade.total_denuncias -= 1
                denuncia.comunidade.save(update_fields=['total_denuncias'])
            recurso = denuncia

        else:
            return Response({'detail': 'Categoria de moderação inválida.'}, status=404)

        registrar_acao(
            ator=request.user,
            acao=f'moderacao.{categoria}.{acao}',
            recurso=recurso.__class__.__name__,
            recurso_id=recurso.pk,
            metadados={'observacao_informada': bool(observacao)},
        )
        return Response({'detail': 'Decisão registrada com sucesso.', 'categoria': categoria, 'acao': acao})


class DashboardAuditoriaAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        try:
            limite_solicitado = int(request.query_params.get('limite', 50))
        except (TypeError, ValueError):
            limite_solicitado = 50
        limite = min(max(limite_solicitado, 1), 200)
        registros = AuditoriaAcao.objects.select_related('ator')[:limite]
        return Response([
            {
                'id': registro.pk,
                'ator': registro.ator.username if registro.ator else 'Sistema',
                'acao': registro.acao,
                'recurso': registro.recurso,
                'recurso_id': registro.recurso_id,
                'sucesso': registro.sucesso,
                'metadados': registro.metadados,
                'criado_em': registro.criado_em,
            }
            for registro in registros
        ])


class DashboardFeatureFlagsAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        return Response([
            {
                'chave': flag.chave,
                'descricao': flag.descricao,
                'habilitada': flag.habilitada,
                'atualizada_em': flag.atualizada_em,
                'atualizada_por': flag.atualizada_por.username if flag.atualizada_por else None,
            }
            for flag in FeatureFlag.objects.select_related('atualizada_por')
        ])

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        chave = request.data.get('chave')
        habilitada = request.data.get('habilitada')
        if not isinstance(habilitada, bool):
            return Response({'habilitada': ['Use verdadeiro ou falso.']}, status=400)
        flag = FeatureFlag.objects.select_for_update().filter(chave=chave).first()
        if not flag:
            return Response({'detail': 'Feature flag inexistente; chaves não podem ser criadas pela API.'}, status=404)
        flag.habilitada = habilitada
        flag.atualizada_por = request.user
        flag.save(update_fields=['habilitada', 'atualizada_por', 'atualizada_em'])
        registrar_acao(
            ator=request.user,
            acao='feature_flag.alterada',
            recurso='FeatureFlag',
            recurso_id=flag.pk,
            metadados={'chave': flag.chave, 'habilitada': flag.habilitada},
        )
        return Response({'chave': flag.chave, 'habilitada': flag.habilitada})

class DashboardLixeiraAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
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
                registrar_acao(
                    ator=request.user,
                    acao='livro.restaurado',
                    recurso='Livro',
                    recurso_id=livro.pk,
                )
                return Response({"sucesso": f"Livro {livro.titulo} restaurado."})
            except Livro.DoesNotExist:
                return Response({"erro": "Livro não encontrado."}, status=404)

        elif acao == 'excluir_livro_permanente':
            try:
                livro = Livro.objects.get(id=item_id)
                livro_id = livro.pk
                livro.delete()
                registrar_acao(
                    ator=request.user,
                    acao='livro.excluido_permanente',
                    recurso='Livro',
                    recurso_id=livro_id,
                )
                return Response({"sucesso": "Livro apagado permanentemente."})
            except Livro.DoesNotExist:
                return Response({"erro": "Livro não encontrado."}, status=404)

        elif acao == 'excluir_denuncia_permanente':
            try:
                denuncia = Denuncia.objects.get(id=item_id)
                denuncia_id = denuncia.pk
                denuncia.delete()
                registrar_acao(
                    ator=request.user,
                    acao='denuncia.excluida_permanente',
                    recurso='Denuncia',
                    recurso_id=denuncia_id,
                )
                return Response({"sucesso": "Denúncia apagada permanentemente."})
            except Denuncia.DoesNotExist:
                return Response({"erro": "Denúncia não encontrada."}, status=404)

        return Response({"erro": "Ação inválida"}, status=400)
