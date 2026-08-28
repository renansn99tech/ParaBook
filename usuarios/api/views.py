from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from django.http import HttpResponse
import json
from usuarios.models import Usuario, SessaoDispositivo, AutenticacaoDoisFatores
from usuarios.services import obter_ou_criar_usuario_customizado
from .serializers import (
    UsuarioSerializer,
    RegisterSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ReauthenticateSerializer,
)
from drf_spectacular.utils import extend_schema
from .throttles import AuthRateThrottle, PasswordResetRateThrottle
from usuarios.audit import registrar_acao
from usuarios.security import (
    criptografar_segredo,
    descriptografar_segredo,
    gerar_segredo_totp,
    montar_uri_totp,
    registrar_sessao,
    renovar_sessao,
    validar_codigo_totp,
)


def _set_auth_cookies(response, refresh):
    access = str(refresh.access_token)
    common = {
        'httponly': True,
        'secure': settings.JWT_COOKIE_SECURE,
        'samesite': settings.JWT_COOKIE_SAMESITE,
        'path': '/',
    }
    response.set_cookie(
        settings.JWT_ACCESS_COOKIE_NAME,
        access,
        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
        **common,
    )
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        str(refresh),
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        **common,
    )
    return response


def _clear_auth_cookies(response):
    common = {
        'path': '/',
        'samesite': settings.JWT_COOKIE_SAMESITE,
    }
    response.delete_cookie(settings.JWT_ACCESS_COOKIE_NAME, **common)
    response.delete_cookie(settings.JWT_REFRESH_COOKIE_NAME, **common)
    return response


class CsrfTokenAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class GovernancaLegalAPIView(APIView):
    """Metadados públicos da política vigente, sem expor configuração sensível."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        controller_ready = all([
            settings.LEGAL_CONTROLLER_NAME,
            settings.LEGAL_CONTROLLER_DOCUMENT,
            settings.LEGAL_CONTROLLER_ADDRESS,
            settings.LEGAL_PRIVACY_CONTACT,
        ])
        return Response({
            'versao_termos': settings.TERMS_VERSION,
            'jurisdicao': settings.LEGAL_JURISDICTION,
            'controlador': {
                'nome': settings.LEGAL_CONTROLLER_NAME,
                'endereco': settings.LEGAL_CONTROLLER_ADDRESS,
                'contato_privacidade': settings.LEGAL_PRIVACY_CONTACT,
                'identificacao_completa': controller_ready,
            },
        })


@method_decorator(csrf_protect, name='dispatch')
class CookieTokenObtainPairAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = TokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        configuracao = AutenticacaoDoisFatores.objects.filter(
            usuario=serializer.user,
            habilitada=True,
        ).first()
        if configuracao:
            codigo = request.data.get('codigo_2fa')
            if not codigo:
                return Response(
                    {'requires_2fa': True, 'detail': 'Informe o código do aplicativo autenticador.'},
                    status=status.HTTP_202_ACCEPTED,
                )
            try:
                segredo = descriptografar_segredo(configuracao.segredo_criptografado)
            except ValueError:
                return Response(
                    {'detail': 'A configuração de segurança precisa ser refeita pelo suporte.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not validar_codigo_totp(segredo, codigo):
                return Response(
                    {'codigo_2fa': ['Código inválido ou expirado.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        refresh = RefreshToken(serializer.validated_data['refresh'])
        registrar_sessao(request, serializer.user, refresh)
        return _set_auth_cookies(Response({'detail': 'Login realizado com sucesso.'}), refresh)


class MobileTokenObtainPairAPIView(APIView):
    """Login para clientes mobile nativos.

    Mantem o fluxo web em cookies HttpOnly separado e entrega tokens no corpo
    apenas para apps nativos, que autenticam as demais rotas via Bearer.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = TokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        configuracao = AutenticacaoDoisFatores.objects.filter(
            usuario=serializer.user,
            habilitada=True,
        ).first()
        if configuracao:
            codigo = request.data.get('codigo_2fa')
            if not codigo:
                return Response(
                    {'requires_2fa': True, 'detail': 'Informe o código do aplicativo autenticador.'},
                    status=status.HTTP_202_ACCEPTED,
                )
            try:
                segredo = descriptografar_segredo(configuracao.segredo_criptografado)
            except ValueError:
                return Response(
                    {'detail': 'A configuração de segurança precisa ser refeita pelo suporte.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not validar_codigo_totp(segredo, codigo):
                return Response(
                    {'codigo_2fa': ['Código inválido ou expirado.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        refresh = RefreshToken(serializer.validated_data['refresh'])
        registrar_sessao(request, serializer.user, refresh)
        return Response({
            'detail': 'Login realizado com sucesso.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class MobileTokenRefreshAPIView(APIView):
    """Rotaciona o refresh JWT enviado pelo cliente mobile nativo."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        raw_refresh = request.data.get('refresh')
        if not raw_refresh:
            return Response({'refresh': ['Este campo é obrigatório.']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            old_refresh = RefreshToken(raw_refresh)
            user = User.objects.get(pk=old_refresh['user_id'], is_active=True)
            sid = old_refresh.get('sid')
            sessao = SessaoDispositivo.objects.filter(pk=sid, usuario=user).first() if sid else None
            if sid and (not sessao or not sessao.ativa):
                raise TokenError('Sessão revogada')
            old_refresh.blacklist()
            new_refresh = RefreshToken.for_user(user)
            if sessao:
                renovar_sessao(sessao, new_refresh)
            else:
                registrar_sessao(request, user, new_refresh)
        except (TokenError, User.DoesNotExist):
            return Response({'detail': 'Sessão inválida.'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({
            'access': str(new_refresh.access_token),
            'refresh': str(new_refresh),
        })


class MobileLogoutAPIView(APIView):
    """Invalida o refresh nativo; logout local continua mesmo se ele já expirou."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_refresh = request.data.get('refresh')
        if raw_refresh:
            try:
                refresh = RefreshToken(raw_refresh)
                sid = refresh.get('sid')
                if sid:
                    SessaoDispositivo.objects.filter(
                        pk=sid,
                        revogada_em__isnull=True,
                    ).update(revogada_em=timezone.now())
                refresh.blacklist()
            except TokenError:
                pass
        return Response({'detail': 'Sessão encerrada.'})


@method_decorator(csrf_protect, name='dispatch')
class CookieTokenRefreshAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not raw_refresh:
            return Response({'detail': 'Sessão expirada.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            old_refresh = RefreshToken(raw_refresh)
            user = User.objects.get(pk=old_refresh['user_id'], is_active=True)
            sid = old_refresh.get('sid')
            sessao = SessaoDispositivo.objects.filter(pk=sid, usuario=user).first() if sid else None
            if sid and (not sessao or not sessao.ativa):
                raise TokenError('Sessão revogada')
            old_refresh.blacklist()
            new_refresh = RefreshToken.for_user(user)
            if sessao:
                renovar_sessao(sessao, new_refresh)
            else:
                registrar_sessao(request, user, new_refresh)
        except (TokenError, User.DoesNotExist):
            return _clear_auth_cookies(
                Response({'detail': 'Sessão inválida.'}, status=status.HTTP_401_UNAUTHORIZED)
            )

        return _set_auth_cookies(Response({'detail': 'Sessão renovada.'}), new_refresh)


@method_decorator(csrf_protect, name='dispatch')
class LogoutAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if raw_refresh:
            try:
                refresh = RefreshToken(raw_refresh)
                sid = refresh.get('sid')
                if sid:
                    SessaoDispositivo.objects.filter(pk=sid, revogada_em__isnull=True).update(
                        revogada_em=timezone.now()
                    )
                refresh.blacklist()
            except TokenError:
                pass
        return _clear_auth_cookies(Response({'detail': 'Sessão encerrada.'}))


@method_decorator(csrf_protect, name='dispatch')
class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    @extend_schema(request=RegisterSerializer, responses={201: None})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            auth_user = serializer.save()

        # Gera sessão em cookies HttpOnly para login automático após o cadastro.
        refresh = RefreshToken.for_user(auth_user)
        registrar_sessao(request, auth_user, refresh)
        response = Response(
            {'detail': 'Cadastro realizado com sucesso.'},
            status=status.HTTP_201_CREATED,
        )
        return _set_auth_cookies(response, refresh)


class MobileRegisterAPIView(APIView):
    """Cadastro para app mobile com retorno de JWT Bearer."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    @extend_schema(request=RegisterSerializer, responses={201: None})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            auth_user = serializer.save()

        refresh = RefreshToken.for_user(auth_user)
        registrar_sessao(request, auth_user, refresh)
        return Response(
            {
                'detail': 'Cadastro realizado com sucesso.',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class UserProfileAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UsuarioSerializer

    def get_object(self):
        return obter_ou_criar_usuario_customizado(self.request.user)


class SessoesDispositivoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sid_atual = str(request.auth.get('sid', '')) if request.auth else ''
        sessoes = SessaoDispositivo.objects.filter(
            usuario=request.user,
            revogada_em__isnull=True,
            expira_em__gt=timezone.now(),
        )
        return Response([
            {
                'id': str(sessao.id),
                'dispositivo': sessao.user_agent or 'Dispositivo não identificado',
                'criada_em': sessao.criada_em,
                'ultima_atividade_em': sessao.ultima_atividade_em,
                'expira_em': sessao.expira_em,
                'atual': str(sessao.id) == sid_atual,
            }
            for sessao in sessoes
        ])

    def delete(self, request):
        sessao_id = request.data.get('sessao_id')
        encerrar_todas = request.data.get('todas') is True
        sessoes = SessaoDispositivo.objects.filter(usuario=request.user, revogada_em__isnull=True)
        if not encerrar_todas:
            if not sessao_id:
                return Response({'sessao_id': ['Informe a sessão.']}, status=400)
            sessoes = sessoes.filter(pk=sessao_id)
        ids = list(sessoes.values_list('id', flat=True))
        if not ids:
            return Response({'detail': 'Sessão não encontrada.'}, status=404)
        sessoes.update(revogada_em=timezone.now())
        registrar_acao(
            ator=request.user,
            acao='sessao.encerrada',
            recurso='SessaoDispositivo',
            recurso_id=str(sessao_id or 'todas'),
            metadados={'quantidade': len(ids)},
        )
        sid_atual = str(request.auth.get('sid', '')) if request.auth else ''
        response = Response({'detail': f'{len(ids)} sessão(ões) encerrada(s).'})
        if encerrar_todas or sid_atual in {str(item) for item in ids}:
            _clear_auth_cookies(response)
        return response


class AutenticacaoDoisFatoresAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        configuracao = AutenticacaoDoisFatores.objects.filter(usuario=request.user).first()
        return Response({'habilitada': bool(configuracao and configuracao.habilitada), 'metodo': 'totp'})

    def post(self, request):
        acao = request.data.get('acao')
        if not request.user.check_password(request.data.get('senha_atual', '')):
            return Response({'senha_atual': ['Senha atual incorreta.']}, status=400)

        if acao == 'iniciar':
            existente = AutenticacaoDoisFatores.objects.filter(usuario=request.user, habilitada=True).exists()
            if existente:
                return Response({'detail': 'A verificação já está habilitada.'}, status=409)
            segredo = gerar_segredo_totp()
            AutenticacaoDoisFatores.objects.update_or_create(
                usuario=request.user,
                defaults={'segredo_criptografado': criptografar_segredo(segredo), 'habilitada': False},
            )
            return Response({'segredo': segredo, 'otpauth_uri': montar_uri_totp(request.user, segredo)})

        if acao == 'confirmar':
            configuracao = AutenticacaoDoisFatores.objects.filter(usuario=request.user).first()
            if not configuracao:
                return Response({'detail': 'Inicie a configuração primeiro.'}, status=409)
            segredo = descriptografar_segredo(configuracao.segredo_criptografado)
            if not validar_codigo_totp(segredo, request.data.get('codigo')):
                return Response({'codigo': ['Código inválido ou expirado.']}, status=400)
            configuracao.habilitada = True
            configuracao.save(update_fields=['habilitada', 'atualizada_em'])
            registrar_acao(ator=request.user, acao='seguranca.2fa_habilitada', recurso='User', recurso_id=request.user.pk)
            return Response({'detail': 'Verificação em duas etapas habilitada.', 'habilitada': True})

        return Response({'acao': ['Ação inválida.']}, status=400)

    def delete(self, request):
        if not request.user.check_password(request.data.get('senha_atual', '')):
            return Response({'senha_atual': ['Senha atual incorreta.']}, status=400)
        configuracao = AutenticacaoDoisFatores.objects.filter(usuario=request.user, habilitada=True).first()
        if not configuracao:
            return Response({'detail': 'A verificação já está desabilitada.'})
        segredo = descriptografar_segredo(configuracao.segredo_criptografado)
        if not validar_codigo_totp(segredo, request.data.get('codigo')):
            return Response({'codigo': ['Código inválido ou expirado.']}, status=400)
        configuracao.delete()
        registrar_acao(ator=request.user, acao='seguranca.2fa_desabilitada', recurso='User', recurso_id=request.user.pk)
        return Response({'detail': 'Verificação em duas etapas desabilitada.'})


class PreferenciasNotificacaoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(self._dados(obter_ou_criar_usuario_customizado(request.user)))

    def patch(self, request):
        usuario = obter_ou_criar_usuario_customizado(request.user)
        campos = ('notificacoes_email', 'notificacoes_comunidades', 'notificacoes_assinaturas')
        atualizados = []
        for campo in campos:
            if campo in request.data:
                valor = request.data[campo]
                if not isinstance(valor, bool):
                    return Response({campo: ['Use verdadeiro ou falso.']}, status=400)
                setattr(usuario, campo, valor)
                atualizados.append(campo)
        if atualizados:
            usuario.save(update_fields=atualizados)
        return Response(self._dados(usuario))

    @staticmethod
    def _dados(usuario):
        return {
            'notificacoes_email': usuario.notificacoes_email,
            'notificacoes_comunidades': usuario.notificacoes_comunidades,
            'notificacoes_assinaturas': usuario.notificacoes_assinaturas,
        }


class ExportarDadosAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        usuario = obter_ou_criar_usuario_customizado(request.user)
        perfil = getattr(request.user, 'perfil', None)
        dados = {
            'exportado_em': timezone.now().isoformat(),
            'conta': {
                'id': request.user.pk,
                'username': request.user.username,
                'email': request.user.email,
                'data_cadastro': request.user.date_joined.isoformat(),
                'nome': usuario.nome,
                'tipo': usuario.tipo,
                'cpf': usuario.cpf,
                'telefone': usuario.telefone,
                'termos_aceitos': usuario.termos_aceitos,
                'versao_termos_aceita': usuario.versao_termos_aceita,
            },
            'perfil': {
                'bio': getattr(perfil, 'bio', None),
                'localizacao': getattr(perfil, 'localizacao', None),
                'descricao': getattr(perfil, 'descricao_perfil', None),
                'privado': getattr(perfil, 'perfil_privado', False),
                'meta_leitura_anual': getattr(perfil, 'meta_leitura_anual', 12),
            },
            'biblioteca': [
                {
                    'livro_id': item.livro_id,
                    'titulo': item.livro.titulo,
                    'status': item.status,
                    'favorito': item.favorito,
                    'nota': item.nota,
                    'resenha': item.resenha,
                    'pagina_atual': item.pagina_atual,
                    'adicionado_em': item.data_adicao.isoformat(),
                    'concluido_em': item.data_conclusao.isoformat() if item.data_conclusao else None,
                }
                for item in request.user.itens_biblioteca.select_related('livro').all()
            ],
            'comunidades': [
                {'id': comunidade.pk, 'nome': comunidade.nome}
                for comunidade in request.user.comunidades_inscritas.all()
            ],
            'notificacoes': [
                {
                    'titulo': item.titulo,
                    'mensagem': item.mensagem,
                    'tipo': item.tipo,
                    'lida': item.lida,
                    'criada_em': item.data_criacao.isoformat(),
                }
                for item in request.user.notificacoes.all()
            ],
        }
        registrar_acao(ator=request.user, acao='lgpd.dados_exportados', recurso='User', recurso_id=request.user.pk)
        response = HttpResponse(
            json.dumps(dados, ensure_ascii=False, indent=2),
            content_type='application/json; charset=utf-8',
        )
        response['Content-Disposition'] = 'attachment; filename="parabook-meus-dados.json"'
        return response


class ExcluirContaAPIView(APIView):
    """
    Versão DRF de `usuarios.views.excluir_conta`.

    Mantém a exclusão transacional (REGRA 2 do projeto): ou o Usuario, o Perfil
    e o User caem juntos, ou nada é apagado. Admin não se autoexclui pela API
    para não deixar a plataforma sem responsável por engano.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ReauthenticateSerializer, responses={204: None})
    def delete(self, request):
        user = request.user

        serializer = ReauthenticateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not user.check_password(serializer.validated_data['senha_atual']):
            return Response(
                {'detail': 'Senha atual incorreta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.is_superuser:
            return Response(
                {"detail": "Contas administrativas não podem ser excluídas por aqui."},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            try:
                usuario_custom = Usuario.objects.get(user_auth=user)
                perfil_vinculado = usuario_custom.perfil

                usuario_custom.delete()
                if perfil_vinculado:
                    perfil_vinculado.delete()
            except Usuario.DoesNotExist:
                pass

            user_id = user.pk
            user.delete()

        registrar_acao(
            ator=None,
            acao='conta.excluida',
            recurso='User',
            recurso_id=user_id,
        )

        return _clear_auth_cookies(Response(status=status.HTTP_204_NO_CONTENT))


class ChangePasswordAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        senha_antiga = request.data.get('senha_antiga')
        nova_senha = request.data.get('nova_senha')

        if not senha_antiga or not nova_senha:
            return Response({"error": "Senha antiga e nova senha são obrigatórias."}, status=400)

        if not user.check_password(senha_antiga):
            return Response({"error": "Senha antiga incorreta."}, status=400)

        user.set_password(nova_senha)
        user.save()
        registrar_acao(
            ator=user,
            acao='senha.alterada',
            recurso='User',
            recurso_id=user.pk,
        )

        return Response({"message": "Senha atualizada com sucesso!"})


@method_decorator(csrf_protect, name='dispatch')
class PasswordResetRequestAPIView(APIView):
    """Dispara o email de redefinicao de senha com um link para o front-end React."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    # Resposta unica para email existente ou nao: evita que a rota vire um
    # oraculo para descobrir quais emails possuem conta no ParaBook.
    MENSAGEM_GENERICA = (
        "Se houver uma conta associada a este e-mail, enviaremos as instruções de "
        "redefinição de senha em instantes."
    )

    @extend_schema(request=PasswordResetRequestSerializer, responses={200: None})
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        usuario = User.objects.filter(email__iexact=email, is_active=True).first()
        if usuario:
            uid = urlsafe_base64_encode(force_bytes(usuario.pk))
            token = default_token_generator.make_token(usuario)
            link = f"{settings.FRONTEND_URL}/redefinir-senha/{uid}/{token}"

            send_mail(
                subject="Redefinição de senha | ParaBook",
                message=(
                    f"Olá, {usuario.username}!\n\n"
                    "Recebemos um pedido para redefinir a senha da sua conta no ParaBook.\n"
                    f"Acesse o link abaixo para cadastrar uma nova senha:\n\n{link}\n\n"
                    "Se não foi você quem solicitou, basta ignorar este e-mail: "
                    "sua senha atual continua valendo."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[usuario.email],
                fail_silently=False,
            )

        return Response({"detail": self.MENSAGEM_GENERICA})


@method_decorator(csrf_protect, name='dispatch')
class PasswordResetConfirmAPIView(APIView):
    """Valida o par uid/token do email e efetiva a nova senha."""
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=PasswordResetConfirmSerializer, responses={200: None})
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            user_id = force_str(urlsafe_base64_decode(dados['uid']))
            usuario = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            usuario = None

        if usuario is None or not default_token_generator.check_token(usuario, dados['token']):
            return Response(
                {"detail": "Link de redefinição inválido ou expirado. Solicite um novo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.set_password(dados['nova_senha'])
        usuario.save()

        return Response({"detail": "Senha redefinida com sucesso! Você já pode entrar na sua conta."})


class AceitarTermosAPIView(APIView):
    """Registra o aceite dos termos de uso (mesma regra da view legada usuarios.views.aceitar_termos)."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: None})
    def post(self, request):
        usuario_custom = obter_ou_criar_usuario_customizado(request.user)

        usuario_custom.termos_aceitos = True
        usuario_custom.data_aceite_termos = timezone.now()
        usuario_custom.versao_termos_aceita = settings.TERMS_VERSION
        usuario_custom.save(update_fields=[
            'termos_aceitos', 'data_aceite_termos', 'versao_termos_aceita'
        ])

        return Response({
            "detail": "Termos aceitos com sucesso.",
            "termos_aceitos": True,
            "versao_termos_aceita": settings.TERMS_VERSION,
        })

