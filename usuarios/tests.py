from datetime import timedelta

from django.contrib.auth.models import User
from django.conf import settings
from django.core.cache import cache
from django.test import TestCase

from usuarios.models import Usuario, SessaoDispositivo, AutenticacaoDoisFatores
from usuarios.security import _codigo_totp, criptografar_segredo
from usuarios.api.serializers import RegisterSerializer
from perfis.api.serializers import PerfilSerializer
from perfis.models import Perfil
from usuarios.services import obter_ou_criar_usuario_customizado
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken


class ObterOuCriarUsuarioCustomizadoTests(TestCase):
    # Regressao: essa logica estava triplicada (e inconsistente entre as
    # copias) em usuarios/api/views.py, perfis/views.py e perfis/api/views.py.

    def test_cria_usuario_leitor_para_user_comum_sem_registro(self):
        user = User.objects.create_user(username='sem-registro', password='x')
        usuario = obter_ou_criar_usuario_customizado(user)
        self.assertEqual(usuario.tipo, 'leitor')
        self.assertEqual(Usuario.objects.filter(user_auth=user).count(), 1)

    def test_cria_usuario_admin_para_superuser_sem_registro(self):
        admin = User.objects.create_superuser(username='root-admin', email='a@a.com', password='x')
        usuario = obter_ou_criar_usuario_customizado(admin)
        self.assertEqual(usuario.tipo, 'admin')

    def test_retorna_registro_existente_sem_duplicar(self):
        user = User.objects.create_user(username='ja-existe', password='x')
        primeira = obter_ou_criar_usuario_customizado(user)
        segunda = obter_ou_criar_usuario_customizado(user)
        self.assertEqual(primeira.pk, segunda.pk)
        self.assertEqual(Usuario.objects.filter(user_auth=user).count(), 1)


class CookieAuthenticationTests(TestCase):
    """Cobertura do fluxo de sessão em cookie HttpOnly + CSRF.

    O front web guarda a sessão em cookies HttpOnly (nunca em localStorage) e
    o backend exige CSRF nos métodos mutáveis. Estes testes travam os quatro
    riscos de regressão mais caros dessa troca de mecanismo: CSRF, expiração,
    rotação de refresh (que também cobre o caso de múltiplas abas) e logout.
    """

    ACCESS = settings.JWT_ACCESS_COOKIE_NAME
    REFRESH = settings.JWT_REFRESH_COOKIE_NAME
    SENHA = 'SenhaForte123!'

    def setUp(self):
        # O throttle de auth (10/min) grava histórico no cache do processo.
        # Sem limpar entre os testes, o volume acumulado de logins/refresh
        # começaria a devolver 429 e deixaria a suíte intermitente.
        cache.clear()
        self.user = User.objects.create_user(username='cookie-user', password=self.SENHA)
        self.client = APIClient(enforce_csrf_checks=True)

    # --- helpers -----------------------------------------------------------

    def _csrf(self):
        return self.client.get('/api/v1/auth/csrf/').data['csrfToken']

    def _login(self):
        return self.client.post(
            '/api/v1/auth/login/',
            {'username': self.user.username, 'password': self.SENHA},
            format='json',
            HTTP_X_CSRFTOKEN=self._csrf(),
        )

    # --- login -------------------------------------------------------------

    def test_login_exige_csrf_e_nao_expoe_tokens_no_json(self):
        sem_csrf = self.client.post(
            '/api/v1/auth/login/',
            {'username': self.user.username, 'password': self.SENHA},
            format='json',
        )
        self.assertEqual(sem_csrf.status_code, 403)

        response = self._login()
        self.assertEqual(response.status_code, 200)
        # O token nunca volta no corpo: quem carrega a sessão é o cookie.
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertTrue(response.cookies[self.ACCESS]['httponly'])
        self.assertTrue(response.cookies[self.REFRESH]['httponly'])
        self.assertEqual(SessaoDispositivo.objects.filter(usuario=self.user).count(), 1)

        sem_csrf_mutavel = self.client.post(
            '/api/v1/auth/alterar-senha/',
            {'senha_antiga': self.SENHA, 'nova_senha': 'NovaSenhaForte123!'},
            format='json',
        )
        self.assertEqual(sem_csrf_mutavel.status_code, 403)

    def test_login_mobile_retorna_tokens_sem_exigir_csrf(self):
        mobile = APIClient(enforce_csrf_checks=True)
        response = mobile.post(
            '/api/v1/auth/mobile-login/',
            {'username': self.user.username, 'password': self.SENHA},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotIn(self.ACCESS, response.cookies)
        self.assertNotIn(self.REFRESH, response.cookies)

    # --- acesso a rota protegida ------------------------------------------

    def test_rota_protegida_sem_credencial_retorna_401(self):
        anonimo = APIClient(enforce_csrf_checks=True)
        self.assertEqual(anonimo.get('/api/v1/auth/profile/').status_code, 401)

    def test_cookie_de_acesso_autentica_get(self):
        self._login()
        # GET é método seguro: passa sem X-CSRFToken, só com o cookie.
        self.assertEqual(self.client.get('/api/v1/auth/profile/').status_code, 200)

    def test_access_token_expirado_e_recusado(self):
        expirado = AccessToken.for_user(self.user)
        expirado.set_exp(lifetime=timedelta(seconds=-1))
        self.client.cookies[self.ACCESS] = str(expirado)
        self.assertEqual(self.client.get('/api/v1/auth/profile/').status_code, 401)

    def test_header_authorization_ignora_csrf(self):
        # Cliente mobile manda Bearer no header e não tem cookie/CSRF de
        # browser. O método mutável precisa passar mesmo sem X-CSRFToken.
        access = str(AccessToken.for_user(self.user))
        mobile = APIClient(enforce_csrf_checks=True)
        resposta = mobile.post(
            '/api/v1/auth/alterar-senha/',
            {'senha_antiga': self.SENHA, 'nova_senha': 'OutraSenhaForte123!'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {access}',
        )
        self.assertEqual(resposta.status_code, 200)

    # --- refresh / rotação -------------------------------------------------

    def test_refresh_sem_cookie_retorna_401(self):
        resposta = self.client.post(
            '/api/v1/auth/refresh/', HTTP_X_CSRFTOKEN=self._csrf()
        )
        self.assertEqual(resposta.status_code, 401)

    def test_refresh_exige_csrf(self):
        self._login()
        self.assertEqual(self.client.post('/api/v1/auth/refresh/').status_code, 403)

    def test_refresh_rotaciona_e_invalida_token_anterior(self):
        self._login()
        refresh_antigo = self.client.cookies[self.REFRESH].value

        renova = self.client.post('/api/v1/auth/refresh/', HTTP_X_CSRFTOKEN=self._csrf())
        self.assertEqual(renova.status_code, 200)
        # A rotação emite um refresh novo (diferente do que veio no login).
        self.assertNotEqual(self.client.cookies[self.REFRESH].value, refresh_antigo)

        # Reapresentar o refresh antigo — cenário de aba que ficou para trás —
        # tem de falhar: ele foi para a blacklist ao ser rotacionado.
        self.client.cookies[self.REFRESH] = refresh_antigo
        reuso = self.client.post('/api/v1/auth/refresh/', HTTP_X_CSRFTOKEN=self._csrf())
        self.assertEqual(reuso.status_code, 401)
        self.assertEqual(reuso.cookies[self.REFRESH].value, '')

    # --- logout ------------------------------------------------------------

    def test_logout_exige_csrf(self):
        self._login()
        self.assertEqual(self.client.post('/api/v1/auth/logout/').status_code, 403)

    def test_logout_limpa_cookies_e_invalida_renovacao(self):
        self._login()
        refresh_antigo = self.client.cookies[self.REFRESH].value

        logout = self.client.post('/api/v1/auth/logout/', HTTP_X_CSRFTOKEN=self._csrf())
        self.assertEqual(logout.status_code, 200)
        self.assertEqual(logout.cookies[self.ACCESS].value, '')
        self.assertEqual(logout.cookies[self.REFRESH].value, '')

        # Depois do logout o refresh está na blacklist: não dá para renovar.
        self.client.cookies[self.REFRESH] = refresh_antigo
        renova = self.client.post('/api/v1/auth/refresh/', HTTP_X_CSRFTOKEN=self._csrf())
        self.assertEqual(renova.status_code, 401)

    def test_usuario_consegue_entrar_novamente_apos_logout(self):
        primeiro_login = self._login()
        self.assertEqual(primeiro_login.status_code, 200)

        logout = self.client.post(
            '/api/v1/auth/logout/',
            HTTP_X_CSRFTOKEN=self._csrf(),
        )
        self.assertEqual(logout.status_code, 200)

        segundo_login = self._login()
        self.assertEqual(segundo_login.status_code, 200)
        self.assertTrue(segundo_login.cookies[self.ACCESS].value)
        self.assertEqual(
            SessaoDispositivo.objects.filter(
                usuario=self.user,
                revogada_em__isnull=True,
            ).count(),
            1,
        )

        perfil = self.client.get('/api/v1/perfis/meu-perfil/')
        self.assertEqual(perfil.status_code, 200)
        self.assertIn('exibir_idade', perfil.data)

    def test_sessao_revogada_invalida_access_imediatamente(self):
        self._login()
        access_antigo = self.client.cookies[self.ACCESS].value
        sessao = self.client.get('/api/v1/auth/sessoes/').data[0]

        resposta = self.client.delete(
            '/api/v1/auth/sessoes/',
            {'sessao_id': sessao['id']},
            format='json',
            HTTP_X_CSRFTOKEN=self._csrf(),
        )
        self.assertEqual(resposta.status_code, 200)

        self.client.cookies[self.ACCESS] = access_antigo
        self.assertEqual(self.client.get('/api/v1/auth/profile/').status_code, 401)


class AceiteTermosVersionadoTests(TestCase):
    def test_cadastro_api_rejeita_aceite_ausente(self):
        serializer = RegisterSerializer(data={
            'username': 'sem-aceite',
            'email': 'sem-aceite@example.com',
            'password': 'SenhaForte123!',
            'termos_aceitos': False,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('termos_aceitos', serializer.errors)

    def test_cadastro_registra_versao_vigente(self):
        serializer = RegisterSerializer(data={
            'username': 'com-aceite',
            'email': 'com-aceite@example.com',
            'password': 'SenhaForte123!',
            'password_confirm': 'SenhaForte123!',
            'termos_aceitos': True,
        })
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        self.assertEqual(
            user.perfil_customizado.versao_termos_aceita,
            settings.TERMS_VERSION,
        )

    def test_cadastro_rejeita_confirmacao_de_senha_divergente(self):
        serializer = RegisterSerializer(data={
            'username': 'senha-diferente',
            'email': 'senha-diferente@example.com',
            'password': 'SenhaForte123!',
            'password_confirm': 'OutraSenha456!',
            'termos_aceitos': True,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('password_confirm', serializer.errors)

    def test_novo_aceite_substitui_versao_antiga(self):
        user = User.objects.create_user(username='aceite-antigo', password='x')
        usuario = Usuario.objects.create(
            user_auth=user,
            termos_aceitos=True,
            versao_termos_aceita='versao-antiga',
        )
        self.client.force_login(user)

        response = self.client.post('/api/v1/auth/aceitar-termos/')
        usuario.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(usuario.versao_termos_aceita, settings.TERMS_VERSION)

    def test_perfil_trata_versao_antiga_como_aceite_pendente(self):
        user = User.objects.create_user(username='perfil-antigo', password='x')
        perfil = Perfil.objects.create(usuario=user)
        Usuario.objects.create(
            user_auth=user,
            perfil=perfil,
            termos_aceitos=True,
            versao_termos_aceita='versao-antiga',
        )

        self.assertFalse(PerfilSerializer(perfil).data['termos_aceitos'])

    def test_governanca_publica_versao_e_jurisdicao(self):
        response = self.client.get('/api/v1/auth/governanca/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['versao_termos'], settings.TERMS_VERSION)
        self.assertEqual(response.data['jurisdicao'], 'Brasil')


class RecursosContaTests(TestCase):
    SENHA = 'SenhaForte123!'

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='conta-segura', email='segura@example.com', password=self.SENHA,
        )
        self.client = APIClient()

    def test_login_com_2fa_exige_e_valida_codigo_totp(self):
        segredo = 'JBSWY3DPEHPK3PXP'
        AutenticacaoDoisFatores.objects.create(
            usuario=self.user,
            segredo_criptografado=criptografar_segredo(segredo),
            habilitada=True,
        )
        sem_codigo = self.client.post(
            '/api/v1/auth/login/',
            {'username': self.user.username, 'password': self.SENHA},
            format='json',
        )
        self.assertEqual(sem_codigo.status_code, 202)
        self.assertTrue(sem_codigo.data['requires_2fa'])

        com_codigo = self.client.post(
            '/api/v1/auth/login/',
            {'username': self.user.username, 'password': self.SENHA, 'codigo_2fa': _codigo_totp(segredo)},
            format='json',
        )
        self.assertEqual(com_codigo.status_code, 200)
        self.assertIn(settings.JWT_ACCESS_COOKIE_NAME, com_codigo.cookies)

    def test_exportacao_lgpd_nao_expoe_senha_ou_tokens(self):
        self.client.force_authenticate(self.user)
        resposta = self.client.get('/api/v1/auth/exportar-dados/')
        conteudo = resposta.content.decode('utf-8')
        self.assertEqual(resposta.status_code, 200)
        self.assertIn('attachment;', resposta['Content-Disposition'])
        self.assertNotIn('password', conteudo.lower())
        self.assertNotIn('refresh', conteudo.lower())


class OnboardingPerfilPendenteTests(TestCase):
    """Cobre a regra do modal 'Termine seu cadastro': no máximo duas exibições
    (uma logo após o cadastro, outra depois de 1 semana) e supressão assim que
    o usuário personaliza o perfil."""

    def _criar(self, **perfil_kwargs):
        from perfis.models import FRASE_STATUS_PADRAO_LEITOR

        user = User.objects.create_user(username='novato', password='x')
        defaults = {'usuario': user, 'descricao_perfil': FRASE_STATUS_PADRAO_LEITOR}
        defaults.update(perfil_kwargs)
        perfil = Perfil.objects.create(**defaults)
        usuario = Usuario.objects.create(
            user_auth=user, nome=user.username, perfil=perfil,
        )
        return user, usuario

    def test_primeira_exibicao_logo_apos_cadastro(self):
        _, usuario = self._criar()
        self.assertTrue(usuario.onboarding_perfil_pendente())

    def test_nao_reexibe_no_mesmo_dia_apos_dispensar(self):
        _, usuario = self._criar()
        usuario.onboarding_lembretes = 1
        usuario.save(update_fields=['onboarding_lembretes'])
        # Recém-cadastrado: ainda não passou 1 semana.
        self.assertFalse(usuario.onboarding_perfil_pendente())

    def test_reexibe_uma_semana_depois(self):
        from django.utils import timezone
        user, usuario = self._criar()
        usuario.onboarding_lembretes = 1
        usuario.save(update_fields=['onboarding_lembretes'])
        User.objects.filter(pk=user.pk).update(
            date_joined=timezone.now() - timedelta(days=8)
        )
        usuario.user_auth.refresh_from_db()
        self.assertTrue(usuario.onboarding_perfil_pendente())

    def test_nunca_exibe_uma_terceira_vez(self):
        from django.utils import timezone
        user, usuario = self._criar()
        usuario.onboarding_lembretes = 2
        usuario.save(update_fields=['onboarding_lembretes'])
        User.objects.filter(pk=user.pk).update(
            date_joined=timezone.now() - timedelta(days=30)
        )
        usuario.user_auth.refresh_from_db()
        self.assertFalse(usuario.onboarding_perfil_pendente())

    def test_perfil_personalizado_suprime_lembrete(self):
        _, usuario = self._criar(localizacao='Belém, PA')
        self.assertFalse(usuario.onboarding_perfil_pendente())
