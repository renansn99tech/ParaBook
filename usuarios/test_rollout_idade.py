import json
from datetime import date, datetime, timedelta, timezone as dt_timezone
from io import StringIO
from unittest.mock import patch
from uuid import uuid4

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from perfis.models import Perfil
from usuarios.checks import verificar_configuracao_etaria
from usuarios.idade import faixa_para_data, politica_esta_ativa, prazo_declaracao, registrar_declaracao, restricao_etaria_ativa
from usuarios.models import EstadoEtarioConta, EventoEtarioConta, ProvaPrivacidade, Usuario


MARCO = datetime(2026, 9, 1, 3, tzinfo=dt_timezone.utc)


@override_settings(AGE_POLICY_ACTIVE=True, AGE_POLICY_ROLLOUT_AT=MARCO, AGE_POLICY_VERSION='idade-s020-sintetica')
class RolloutIdadeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='rollout-sintetico', password='senha-sintetica')
        self.user.date_joined = MARCO - timedelta(days=30)
        self.user.save(update_fields=['date_joined'])
        perfil = Perfil.objects.create(usuario=self.user)
        self.negocio = Usuario.objects.create(user_auth=self.user, perfil=perfil, termos_aceitos=True,
                                               versao_termos_aceita=settings.TERMS_VERSION)

    def declarar(self, nascimento, chave=None):
        return registrar_declaracao(usuario_auth=self.user, data_nascimento=nascimento,
                                    chave_idempotencia=chave or uuid4(), origem='mobile')

    def test_conta_antiga_recebe_sete_dias_do_marco_sem_alterar_date_joined(self):
        antes = self.user.date_joined
        self.assertEqual(prazo_declaracao(self.user), MARCO + timedelta(days=7))
        self.user.refresh_from_db()
        self.assertEqual(self.user.date_joined, antes)

    def test_conta_nova_recebe_sete_dias_completos(self):
        self.user.date_joined = MARCO + timedelta(hours=8)
        self.assertEqual(prazo_declaracao(self.user), self.user.date_joined + timedelta(days=7))

    def test_fronteira_exata_nao_bloqueia_antes_e_bloqueia_no_prazo(self):
        prazo = prazo_declaracao(self.user)
        with patch('usuarios.idade.timezone.now', return_value=prazo - timedelta(microseconds=1)):
            self.assertFalse(restricao_etaria_ativa(self.user)[0])
        with patch('usuarios.idade.timezone.now', return_value=prazo):
            self.assertTrue(restricao_etaria_ativa(self.user)[0])

    def test_fuso_equivalente_preserva_o_mesmo_prazo(self):
        with override_settings(AGE_POLICY_ROLLOUT_AT='2026-09-01T00:00:00-03:00'):
            self.assertEqual(prazo_declaracao(self.user), MARCO + timedelta(days=7))

    def test_flag_desligada_preserva_estado_eventos_e_nao_inicializa_conta_por_acesso(self):
        with override_settings(AGE_POLICY_ACTIVE=False):
            self.assertFalse(restricao_etaria_ativa(self.user)[0])
            self.assertFalse(EstadoEtarioConta.objects.filter(usuario=self.user).exists())
        self.declarar(date(2012, 1, 1))
        total = self.user.eventos_etarios.count()
        with override_settings(AGE_POLICY_ACTIVE=False):
            self.assertFalse(restricao_etaria_ativa(self.user)[0])
        self.assertTrue(restricao_etaria_ativa(self.user)[0])
        self.assertEqual(self.user.eventos_etarios.count(), total)

    def test_marco_futuro_nao_antecipa_rollout(self):
        with patch('usuarios.idade.timezone.now', return_value=MARCO - timedelta(seconds=1)):
            self.assertFalse(politica_esta_ativa())

    def test_configuracoes_incompletas_falham_em_vez_de_liberar(self):
        for marco in ['', 'invalido', '2026-09-01T00:00:00']:
            with self.subTest(marco=marco), override_settings(AGE_POLICY_ROLLOUT_AT=marco):
                self.assertEqual(verificar_configuracao_etaria(None)[0].id, 'usuarios.E001')
                with self.assertRaises(ImproperlyConfigured):
                    restricao_etaria_ativa(self.user)
        with override_settings(AGE_POLICY_VERSION=''):
            self.assertEqual(verificar_configuracao_etaria(None)[0].id, 'usuarios.E001')

    def test_aniversario_dezoito_e_ano_bissexto(self):
        self.assertEqual(faixa_para_data(date(2008, 10, 5), hoje=date(2026, 10, 4)), 'menor_18')
        self.assertEqual(faixa_para_data(date(2008, 10, 5), hoje=date(2026, 10, 5)), '18_mais')
        self.assertEqual(faixa_para_data(date(2008, 2, 29), hoje=date(2026, 2, 28)), 'menor_18')
        self.assertEqual(faixa_para_data(date(2008, 2, 29), hoje=date(2026, 3, 1)), '18_mais')

    def test_data_futura_ou_inverossimil_nao_cria_declaracao(self):
        for nascimento in [date(2200, 1, 1), date(1800, 1, 1)]:
            with self.assertRaises(ValidationError):
                self.declarar(nascimento)
        self.assertEqual(EventoEtarioConta.objects.filter(usuario=self.user).count(), 0)

    def test_segunda_correcao_imediata_e_terceira_so_no_limite(self):
        self.declarar(date(2012, 1, 1))
        self.declarar(date(1990, 1, 1))
        estado = EstadoEtarioConta.objects.get(usuario=self.user)
        with patch('usuarios.idade.timezone.now', return_value=estado.proxima_correcao_permitida_em - timedelta(microseconds=1)):
            with self.assertRaises(ValidationError):
                self.declarar(date(1991, 1, 1))
        with patch('usuarios.idade.timezone.now', return_value=estado.proxima_correcao_permitida_em):
            self.declarar(date(1991, 1, 1))
        estado.refresh_from_db()
        self.assertEqual(estado.declaracoes_sucesso, 3)

    def test_falha_na_prova_r10_reverte_data_contador_evento_e_suporte(self):
        with patch('usuarios.privacidade_provas.registrar_prova', side_effect=RuntimeError('falha sintética')):
            with self.assertRaises(RuntimeError):
                self.declarar(date(2012, 1, 1))
        self.negocio.refresh_from_db()
        self.assertIsNone(self.negocio.data_nascimento_eligibilidade)
        self.assertFalse(EstadoEtarioConta.objects.filter(usuario=self.user).exists())
        self.assertFalse(ProvaPrivacidade.objects.filter(usuario=self.user).exists())

    def test_chave_alheia_nao_libera_conta_nem_causa_integrity_error(self):
        evento, _ = self.declarar(date(1990, 1, 1))
        outra = User.objects.create_user(username='outra-sintetica')
        with self.assertRaises(ValidationError):
            registrar_declaracao(usuario_auth=outra, data_nascimento=date(1990, 1, 1),
                                chave_idempotencia=evento.chave_idempotencia, origem='mobile')
        self.assertFalse(EstadoEtarioConta.objects.filter(usuario=outra).exists())

    def test_censo_agregado_nao_grava_estado_nem_expoe_contas(self):
        saida = StringIO()
        call_command('censo_rollout_idade', marco=MARCO.isoformat(), versao='ensaio', stdout=saida)
        resultado = json.loads(saida.getvalue())
        self.assertEqual(resultado['contagens']['preexistentes'], 1)
        self.assertNotIn(self.user.username, saida.getvalue())
        self.assertFalse(EstadoEtarioConta.objects.filter(usuario=self.user).exists())

    def test_estados_restritos_e_papeis_bloqueiam_apis_por_tres_autenticacoes(self):
        rotas = [
            ('get', '/api/v1/perfis/meu-perfil/'), ('get', '/api/v1/comunidades/comunidades/'),
            ('post', '/api/v1/comunidades/postagens/'), ('get', '/api/v1/biblioteca/estante/'),
            ('post', '/api/v1/biblioteca/estante/'), ('post', '/api/v1/biblioteca/solicitacoes-publicacao/'),
            ('get', '/api/v1/biblioteca/minhas-publicacoes/'), ('get', '/api/v1/biblioteca/recomendacoes-ia/'),
            ('get', '/api/v1/dashboard/usuarios/'), ('get', '/api/v1/notificacoes/'),
            ('get', '/api/v1/gamificacao/meus-stats/'), ('get', '/api/v1/assinaturas/minha-assinatura/'),
        ]
        for estado in ['pendente', 'restrito_menor', 'em_revisao']:
            EstadoEtarioConta.objects.update_or_create(usuario=self.user, defaults={'estado': estado})
            for papel in ['leitor', 'aguardando_aprovacao', 'autor', 'moderador', 'admin']:
                self.negocio.tipo = papel
                self.negocio.save(update_fields=['tipo'])
                self.user.is_superuser = papel == 'admin'
                self.user.is_staff = papel in {'moderador', 'admin'}
                self.user.save(update_fields=['is_superuser', 'is_staff'])
                for transporte in ['bearer', 'cookie', 'sessao']:
                    client = APIClient()
                    access = str(RefreshToken.for_user(self.user).access_token)
                    if transporte == 'sessao':
                        client.force_login(self.user)
                    elif transporte == 'cookie':
                        client.cookies[settings.JWT_ACCESS_COOKIE_NAME] = access
                    else:
                        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
                    for metodo, rota in rotas:
                        with self.subTest(estado=estado, papel=papel, transporte=transporte, rota=rota):
                            response = getattr(client, metodo)(rota)
                            self.assertEqual(response.status_code, 403)
                            self.assertEqual(response.data['codigo'], 'conta_restrita_etaria')

    def test_cookie_e_sessionid_nao_recuperam_privilegios_no_catalogo(self):
        from usuarios.api.authentication import CookieJWTAuthentication, SessaoProtegidaAuthentication
        from rest_framework.request import Request
        from rest_framework.test import APIRequestFactory
        EstadoEtarioConta.objects.create(usuario=self.user, estado='restrito_menor')
        request = APIRequestFactory().get('/api/v1/biblioteca/livros/')
        request.user = self.user
        request.COOKIES[settings.JWT_ACCESS_COOKIE_NAME] = str(RefreshToken.for_user(self.user).access_token)
        drf_request = Request(request)
        self.assertIsNone(CookieJWTAuthentication().authenticate(drf_request))
        self.assertIsNone(SessaoProtegidaAuthentication().authenticate(drf_request))

    def test_legado_e_admin_nao_contornam_restricao_e_declaracao_funciona(self):
        self.client.force_login(self.user)
        self.assertRedirects(self.client.get('/admin/'), reverse('usuarios:elegibilidade'), fetch_redirect_response=False)
        self.assertRedirects(self.client.post('/biblioteca/adicionar/1/'), reverse('usuarios:elegibilidade'), fetch_redirect_response=False)
        response = self.client.get(reverse('usuarios:elegibilidade'))
        self.assertContains(response, 'Modo Restrito')
        self.assertIn('no-store', response.headers['Cache-Control'])
        response = self.client.post(reverse('usuarios:elegibilidade'), {
            'data_nascimento': '1990-01-01', 'confirmacao': 'on', 'chave_idempotencia': uuid4(),
        })
        self.assertEqual(response.status_code, 302)
        self.assertFalse(restricao_etaria_ativa(self.user)[0])

    def test_estado_e_direitos_acessiveis_sem_aceite_novo_e_sem_cache(self):
        self.negocio.termos_aceitos = False
        self.negocio.save(update_fields=['termos_aceitos'])
        client = APIClient()
        client.force_login(self.user)
        self.assertEqual(client.get(reverse('api_idade')).status_code, 200)
        self.assertEqual(client.get(reverse('api_idade')).headers['Cache-Control'], 'no-store')
        self.assertEqual(client.get(reverse('api_suporte')).status_code, 200)
        self.assertEqual(client.get(reverse('api_exportar_dados')).status_code, 200)

    def test_sessao_exige_csrf_para_declarar(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.user)
        response = client.put(reverse('api_idade'), {'data_nascimento': '1990-01-01', 'chave_idempotencia': str(uuid4())}, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.user.eventos_etarios.exclude(tipo='conta_inicializada').count(), 0)

    def test_suspensao_nao_contorna_idade_no_conteudo_publico_social(self):
        from usuarios.models import SuspensaoConta
        from django.utils import timezone
        EstadoEtarioConta.objects.create(usuario=self.user, estado='restrito_menor')
        SuspensaoConta.objects.create(usuario=self.user, duracao_dias=3, categoria='conduta',
                                      justificativa='Sintética', termina_em=timezone.now() + timedelta(days=3))
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(self.user).access_token}')
        self.assertEqual(client.get('/api/v1/comunidades/comunidades/').data['codigo'], 'conta_restrita_etaria')
        self.assertEqual(client.get('/api/v1/auth/idade/').status_code, 200)
