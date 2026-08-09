from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from usuarios.models import Usuario
from usuarios.services import obter_ou_criar_usuario_customizado
from .serializers import (
    UsuarioSerializer,
    RegisterSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from drf_spectacular.utils import extend_schema


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=RegisterSerializer, responses={201: None})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            auth_user = serializer.save()

        # Gera tokens JWT para login automático após o cadastro
        refresh = RefreshToken.for_user(auth_user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class UserProfileAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UsuarioSerializer

    def get_object(self):
        return obter_ou_criar_usuario_customizado(self.request.user)


class ExcluirContaAPIView(APIView):
    """
    Versão DRF de `usuarios.views.excluir_conta`.

    Mantém a exclusão transacional (REGRA 2 do projeto): ou o Usuario, o Perfil
    e o User caem juntos, ou nada é apagado. Admin não se autoexclui pela API
    para não deixar a plataforma sem responsável por engano.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def delete(self, request):
        user = request.user

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

            user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


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

        return Response({"message": "Senha atualizada com sucesso!"})


class PasswordResetRequestAPIView(APIView):
    """Dispara o email de redefinicao de senha com um link para o front-end React."""
    permission_classes = [permissions.AllowAny]

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
        usuario_custom.save(update_fields=['termos_aceitos', 'data_aceite_termos'])

        return Response({"detail": "Termos aceitos com sucesso.", "termos_aceitos": True})

