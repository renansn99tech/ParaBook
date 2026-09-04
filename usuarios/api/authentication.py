from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from usuarios.models import SessaoDispositivo


class CookieJWTAuthentication(JWTAuthentication):
    """Autentica JWT por header (mobile) ou cookie HttpOnly (web).

    Quando o cookie é usado, métodos mutáveis exigem o token CSRF. Requisições
    com Authorization continuam adequadas para clientes não baseados em browser.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            resultado = super().authenticate(request)
            if resultado:
                self._validar_sessao(resultado[1])
            return resultado

        raw_token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE_NAME)
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        self._validar_sessao(validated_token)
        self._enforce_csrf(request)
        return self.get_user(validated_token), validated_token

    @staticmethod
    def _validar_sessao(validated_token):
        sid = validated_token.get('sid')
        if not sid:
            # Compatibilidade temporária com tokens emitidos antes do rastreio
            # de sessões. Eles expiram naturalmente no prazo curto do access JWT.
            return
        sessao = SessaoDispositivo.objects.filter(pk=sid).only('revogada_em', 'expira_em').first()
        if not sessao or not sessao.ativa:
            raise AuthenticationFailed('Esta sessão foi encerrada.')

    @staticmethod
    def _enforce_csrf(request):
        check = CSRFCheck(lambda req: None)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise PermissionDenied(f"Falha na validação CSRF: {reason}")


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'usuarios.api.authentication.CookieJWTAuthentication'
    name = 'cookieJwtAuth'

    def get_security_definition(self, auto_schema):
        return {
            'type': 'apiKey',
            'in': 'cookie',
            'name': settings.JWT_ACCESS_COOKIE_NAME,
            'description': 'JWT de acesso em cookie HttpOnly; escritas também exigem X-CSRFToken.',
        }
