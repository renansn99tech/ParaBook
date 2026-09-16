from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from usuarios.models import SessaoDispositivo
from usuarios.governanca import dados_suspensao_ativa
from usuarios.idade import restricao_etaria_ativa, resumo_estado


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

# A conta restrita por idade mantém somente os meios necessários para consultar
# seu estado, corrigir a declaração, exercer direitos e sair. Catálogo público
# continua disponível como visitante; perfil, comunidades e leitura autenticada
# não entram nesta allowlist.
ROTAS_CONTA_RESTRITA_ETARIA = {
    '/api/v1/auth/profile/',
    '/api/v1/auth/idade/',
    '/api/v1/auth/alterar-senha/',
    '/api/v1/auth/aceitar-termos/',
    '/api/v1/auth/excluir-conta/',
    '/api/v1/auth/sessoes/',
    '/api/v1/auth/dois-fatores/',
    '/api/v1/auth/preferencias-notificacao/',
    '/api/v1/auth/aparencia/',
    '/api/v1/auth/exportar-dados/',
    '/api/v1/auth/suporte/',
    '/api/v1/auth/logout/',
}
ROTAS_PUBLICAS_RESTRITA_ETARIA = (
    '/api/v1/biblioteca/livros/',
    '/api/v1/biblioteca/categorias/',
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
                resultado = self._aplicar_restricao_suspensao(request, resultado)
                if resultado is None:
                    return None
                return self._aplicar_restricao_etaria(request, resultado)
            return None

        raw_token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE_NAME)
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        self._validar_sessao(validated_token)
        resultado = (self.get_user(validated_token), validated_token)
        resultado = self._aplicar_restricao_suspensao(request, resultado)
        if resultado is None:
            return None
        resultado = self._aplicar_restricao_etaria(request, resultado)
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
    def _aplicar_restricao_etaria(request, resultado):
        user, _validated_token = resultado
        restrita, _estado = restricao_etaria_ativa(user)
        if not restrita:
            return resultado

        caminho = request.path
        metodo_seguro = request.method in {'GET', 'HEAD', 'OPTIONS'}
        if caminho in ROTAS_CONTA_RESTRITA_ETARIA:
            return resultado
        if metodo_seguro and any(
            caminho.startswith(prefixo) for prefixo in ROTAS_PUBLICAS_RESTRITA_ETARIA
        ):
            return None
        raise PermissionDenied({
            'detail': 'Esta conta está em modo restrito de idade. Informe ou corrija sua declaração para acessar áreas autenticadas.',
            'codigo': 'conta_restrita_etaria',
            'idade': resumo_estado(user),
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
