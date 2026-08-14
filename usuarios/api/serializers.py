from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.conf import settings
from usuarios.models import Usuario
from perfis.models import Perfil
from django.utils import timezone


class UserAuthSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class UsuarioSerializer(serializers.ModelSerializer):
    user_auth = UserAuthSerializer(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'user_auth', 'nome', 'tipo', 'cpf', 'termos_aceitos',
            'data_aceite_termos', 'versao_termos_aceita',
        ]


class RegisterSerializer(serializers.Serializer):
    """Serializer para criação de conta: cria User + Perfil + Usuario de forma transacional."""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    termos_aceitos = serializers.BooleanField(write_only=True)

    def validate_termos_aceitos(self, value):
        if value is not True:
            raise serializers.ValidationError(
                'Você deve ler e aceitar os termos vigentes para criar uma conta.'
            )
        return value

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Este nome de usuário já está em uso.")
        return value

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este email já está cadastrado.")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        auth_user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )

        novo_perfil = Perfil.objects.create(
            usuario=auth_user,
            descricao_perfil="Olá! Sou um novo leitor do ParaBook.",
            historico="Nenhum livro lido ainda.",
        )

        Usuario.objects.create(
            user_auth=auth_user,
            nome=validated_data['username'],
            perfil=novo_perfil,
            termos_aceitos=True,
            data_aceite_termos=timezone.now(),
            versao_termos_aceita=settings.TERMS_VERSION,
        )

        return auth_user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    nova_senha = serializers.CharField(write_only=True)

    def validate_nova_senha(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


class ReauthenticateSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True)

