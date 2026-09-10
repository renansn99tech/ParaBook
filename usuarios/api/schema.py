"""Serializers documentais para payloads montados pelas APIViews de autenticação."""

from rest_framework import serializers

from perfis.api.serializers import PerfilSerializer


class DetailResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class CsrfTokenResponseSerializer(serializers.Serializer):
    csrfToken = serializers.CharField()


class ControladorLegalSerializer(serializers.Serializer):
    nome = serializers.CharField()
    endereco = serializers.CharField(allow_blank=True)
    contato_privacidade = serializers.CharField(allow_blank=True)
    identificacao_completa = serializers.BooleanField()


class GovernancaLegalResponseSerializer(serializers.Serializer):
    versao_termos = serializers.CharField()
    jurisdicao = serializers.CharField()
    controlador = ControladorLegalSerializer()


class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    codigo_2fa = serializers.CharField(required=False, write_only=True)


class CookieLoginResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    requires_2fa = serializers.BooleanField(required=False)


class MobileLoginResponseSerializer(CookieLoginResponseSerializer):
    access = serializers.CharField(required=False, write_only=True)
    refresh = serializers.CharField(required=False, write_only=True)


class MobileRefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True)


class MobileRefreshResponseSerializer(serializers.Serializer):
    access = serializers.CharField(write_only=True)
    refresh = serializers.CharField(write_only=True)


class MobileLogoutRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, write_only=True)


class SessaoDispositivoSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    dispositivo = serializers.CharField()
    criada_em = serializers.DateTimeField()
    ultima_atividade_em = serializers.DateTimeField()
    expira_em = serializers.DateTimeField()
    atual = serializers.BooleanField()


class EncerrarSessaoRequestSerializer(serializers.Serializer):
    sessao_id = serializers.UUIDField(required=False)
    todas = serializers.BooleanField(required=False, default=False)


class DoisFatoresStatusSerializer(serializers.Serializer):
    habilitada = serializers.BooleanField()
    metodo = serializers.ChoiceField(choices=['totp'], required=False)
    detail = serializers.CharField(required=False)


class DoisFatoresRequestSerializer(serializers.Serializer):
    acao = serializers.ChoiceField(choices=['iniciar', 'confirmar'], required=False)
    senha_atual = serializers.CharField(write_only=True)
    codigo = serializers.CharField(required=False, write_only=True)


class DoisFatoresConfiguracaoSerializer(DoisFatoresStatusSerializer):
    segredo = serializers.CharField(required=False, write_only=True)
    otpauth_uri = serializers.CharField(required=False, write_only=True)


class PreferenciasNotificacaoSerializer(serializers.Serializer):
    notificacoes_email = serializers.BooleanField(required=False)
    notificacoes_comunidades = serializers.BooleanField(required=False)
    notificacoes_assinaturas = serializers.BooleanField(required=False)


class PreferenciaAparenciaRequestSerializer(serializers.Serializer):
    tipografia = serializers.CharField()


class PreferenciaAparenciaResponseSerializer(PerfilSerializer):
    pass


class SolicitacaoSuporteRequestSerializer(serializers.Serializer):
    categoria = serializers.CharField(required=False, default='conta', max_length=40)
    assunto = serializers.CharField(min_length=5, max_length=120)
    mensagem = serializers.CharField(min_length=20, max_length=4000)


class SolicitacaoSuporteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    protocolo = serializers.UUIDField()
    categoria = serializers.CharField()
    assunto = serializers.CharField()
    mensagem = serializers.CharField()
    status = serializers.CharField()
    resposta = serializers.CharField(allow_blank=True, allow_null=True)
    criada_em = serializers.DateTimeField()
    atualizada_em = serializers.DateTimeField()


class ChangePasswordRequestSerializer(serializers.Serializer):
    senha_antiga = serializers.CharField(write_only=True)
    nova_senha = serializers.CharField(write_only=True)


class ChangePasswordResponseSerializer(serializers.Serializer):
    message = serializers.CharField()


class AceitarTermosResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    termos_aceitos = serializers.BooleanField()
    versao_termos_aceita = serializers.CharField()
