from datetime import timedelta
from uuid import uuid4

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from perfis.models import Perfil
from usuarios.models import EstadoEtarioConta, EventoEtarioConta, SolicitacaoSuporte, Usuario


@override_settings(
    AGE_POLICY_ACTIVE=True,
    AGE_POLICY_ROLLOUT_AT='2026-09-01T00:00:00-03:00',
    AGE_POLICY_VERSION='idade-v1-teste',
)
class ElegibilidadeEtariaAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='idade-leitor', password='senha-forte')
        self.user.date_joined = timezone.now() - timedelta(days=8)
        self.user.save(update_fields=['date_joined'])
        perfil = Perfil.objects.create(usuario=self.user)
        Usuario.objects.create(user_auth=self.user, nome='Leitor de idade', perfil=perfil)
        access = RefreshToken.for_user(self.user).access_token
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        self.url = reverse('api_idade')

    def _declarar(self, data_nascimento, chave=None):
        return self.client.put(
            self.url,
            {
                'data_nascimento': data_nascimento,
                'chave_idempotencia': str(chave or uuid4()),
            },
            format='json',
        )

    def test_pendente_apos_prazo_bloqueia_navegacao_forcada_mas_permite_fluxo_etario(self):
        consulta = self.client.get(self.url)
        self.assertEqual(consulta.status_code, 200)
        self.assertTrue(consulta.data['restricao_ativa'])
        self.assertEqual(consulta.data['estado'], EstadoEtarioConta.Estado.PENDENTE)

        bloqueada = self.client.get(reverse('api-meu-perfil'))
        self.assertEqual(bloqueada.status_code, 403)
        self.assertEqual(bloqueada.data['codigo'], 'conta_restrita_etaria')

    def test_declaracao_de_menor_restringe_imediatamente_sem_desativar_conta(self):
        resposta = self._declarar('2012-05-10')

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['estado'], EstadoEtarioConta.Estado.RESTRITO_MENOR)
        self.assertTrue(resposta.data['restricao_ativa'])
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertEqual(
            EventoEtarioConta.objects.filter(
                usuario=self.user,
                tipo=EventoEtarioConta.Tipo.DECLARACAO_REGISTRADA,
            ).count(),
            1,
        )
        self.assertTrue(SolicitacaoSuporte.objects.filter(
            usuario=self.user,
            categoria='idade',
            status=SolicitacaoSuporte.Status.ABERTA,
        ).exists())

    def test_declaracao_adulta_libera_e_nao_expoe_data_na_resposta(self):
        resposta = self._declarar('1990-05-10')

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['estado'], EstadoEtarioConta.Estado.LIBERADO_ADULTO)
        self.assertFalse(resposta.data['restricao_ativa'])
        self.assertNotIn('data_nascimento', resposta.data)
        self.assertEqual(self.client.get(reverse('api-meu-perfil')).status_code, 200)

    def test_chave_idempotente_nao_duplica_evidencia_nem_contador(self):
        chave = uuid4()
        primeira = self._declarar('1990-05-10', chave)
        repetida = self._declarar('1990-05-10', chave)

        self.assertEqual(primeira.status_code, 200)
        self.assertEqual(repetida.status_code, 200)
        estado = EstadoEtarioConta.objects.get(usuario=self.user)
        self.assertEqual(estado.declaracoes_sucesso, 1)
        self.assertEqual(
            EventoEtarioConta.objects.filter(
                usuario=self.user,
                chave_idempotencia=chave,
            ).count(),
            1,
        )

    def test_terceira_definicao_respeita_intervalo_de_sete_dias(self):
        self.assertEqual(self._declarar('1990-05-10').status_code, 200)
        segunda = self._declarar('2012-05-10')
        terceira = self._declarar('1990-05-10')

        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(terceira.status_code, 400)
        self.assertIn('proxima_correcao_permitida_em', terceira.data)
        estado = EstadoEtarioConta.objects.get(usuario=self.user)
        self.assertEqual(estado.declaracoes_sucesso, 2)
