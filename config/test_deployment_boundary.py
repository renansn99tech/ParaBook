from django.test import SimpleTestCase

from config.deployment_boundary import validar_fronteira_compartilhada


class FronteiraCompartilhadaTests(SimpleTestCase):
    CONFIGURACAO = {
        'site_domain': 'parabook.com.br',
        'frontend_url': 'https://app.parabook.com.br',
        'backend_url': 'https://api.parabook.com.br',
        'allowed_hosts': ['api.parabook.com.br', 'parabook-api.onrender.com'],
        'cors_origins': ['https://app.parabook.com.br'],
        'csrf_origins': ['https://app.parabook.com.br'],
        'cookie_samesites': ['Lax', 'Lax', 'Lax'],
    }

    def test_aceita_subdominios_https_do_mesmo_site(self):
        validar_fronteira_compartilhada(**self.CONFIGURACAO)

    def test_rejeita_preview_de_terceiro_na_allowlist_de_producao(self):
        configuracao = {**self.CONFIGURACAO, 'cors_origins': ['https://preview.vercel.app']}
        with self.assertRaisesRegex(ValueError, 'fora de parabook.com.br'):
            validar_fronteira_compartilhada(**configuracao)

    def test_rejeita_cookie_cross_site_no_modo_compartilhado(self):
        configuracao = {**self.CONFIGURACAO, 'cookie_samesites': ['None', 'Lax', 'Lax']}
        with self.assertRaisesRegex(ValueError, 'SameSite=Lax ou Strict'):
            validar_fronteira_compartilhada(**configuracao)

    def test_rejeita_origem_sem_https(self):
        configuracao = {**self.CONFIGURACAO, 'frontend_url': 'http://app.parabook.com.br'}
        with self.assertRaisesRegex(ValueError, 'origem HTTPS'):
            validar_fronteira_compartilhada(**configuracao)

    def test_rejeita_url_com_query_ou_credencial(self):
        for url in [
            'https://app.parabook.com.br?preview=1',
            'https://usuario@app.parabook.com.br',
        ]:
            with self.subTest(url=url):
                configuracao = {**self.CONFIGURACAO, 'frontend_url': url}
                with self.assertRaisesRegex(ValueError, 'origem HTTPS sem caminho'):
                    validar_fronteira_compartilhada(**configuracao)

    def test_rejeita_porta_invalida_ou_nao_padrao(self):
        for url in [
            'https://app.parabook.com.br:invalida',
            'https://app.parabook.com.br:8443',
        ]:
            with self.subTest(url=url):
                configuracao = {**self.CONFIGURACAO, 'frontend_url': url}
                with self.assertRaisesRegex(ValueError, 'origem HTTPS sem caminho'):
                    validar_fronteira_compartilhada(**configuracao)

    def test_rejeita_backend_ausente_ou_curinga_em_allowed_hosts(self):
        for hosts in [['parabook-api.onrender.com'], ['*']]:
            with self.subTest(hosts=hosts):
                configuracao = {**self.CONFIGURACAO, 'allowed_hosts': hosts}
                with self.assertRaisesRegex(ValueError, 'ALLOWED_HOSTS'):
                    validar_fronteira_compartilhada(**configuracao)

    def test_rejeita_frontend_ausente_de_cors_ou_csrf(self):
        for chave in ['cors_origins', 'csrf_origins']:
            with self.subTest(chave=chave):
                configuracao = {
                    **self.CONFIGURACAO,
                    chave: ['https://admin.parabook.com.br'],
                }
                with self.assertRaisesRegex(ValueError, 'precisa incluir FRONTEND_URL'):
                    validar_fronteira_compartilhada(**configuracao)
