from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from usuarios.models import SessaoDispositivo
from usuarios.governanca import dados_suspensao_ativa


ROTAS_CONTA_SUSPENSA = {
    '/api/v1/auth/profile/',
    '/api/v1/auth/alterar-senha/',
    '/api/v1/auth/aceitar-termos/',
    '/api/v1/auth/excluir-conta/',
    '/api/v1/auth/sessoes/',
    '/api/v1/auth/dois-fatores/',
    '/api/v1/auth/preferencias-notificacao/',
    '/api/v1/auth/aparencia/',
    '/api/v1/auth/exportar-dados/',
    '/api/v1/auth/suporte/',
}
ROTAS_PUBLICAS_SUSPENSA = (
    '/api/v1/biblioteca/livros/',
    '/api/v1/biblioteca/categorias/',
    '/api/v1/comunidades/comunidades/',
    '/api/v1/comunidades/postagens/',
    '/api/v1/comunidades/respostas/',
    '/api/v1/perfis/autores/',
    '/api/v1/perfis/',
    '/api/v1/dashboard/feature-flags/publicas/',
)


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
                return self._aplicar_restricao_suspensao(request, resultado)
            return None

        raw_token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE_NAME)
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        self._validar_sessao(validated_token)
        resultado = (self.get_user(validated_token), validated_token)
        resultado = self._aplicar_restricao_suspensao(request, resultado)
        if resultado:
            self._enforce_csrf(request)
        return resultado

    @staticmethod
    def _aplicar_restricao_suspensao(request, resultado):
        user, validated_token = resultado
        suspensao = dados_suspensao_ativa(user)
        if not suspensao:
            return resultado

        caminho = request.path
        metodo_seguro = request.method in {'GET', 'HEAD', 'OPTIONS'}
        if caminho in ROTAS_CONTA_SUSPENSA:
            return resultado
        if caminho == '/api/v1/perfis/meu-perfil/' and metodo_seguro:
            return resultado
        if metodo_seguro and any(caminho.startswith(prefixo) for prefixo in ROTAS_PUBLICAS_SUSPENSA):
            # O conteúdo público é calculado exatamente como para um visitante;
            # isso evita vazar estante, associação a comunidades ou privilégios.
            return None

        raise PermissionDenied({
            'detail': 'Conta temporariamente suspensa. Apenas configurações e suporte estão disponíveis.',
            'codigo': 'conta_suspensa',
            'suspensao': suspensao,
        })

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
