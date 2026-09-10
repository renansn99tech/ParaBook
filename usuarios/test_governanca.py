from importlib import import_module
from types import SimpleNamespace

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from perfis.models import Perfil
from usuarios.governanca import alterar_papel, aplicar_suspensao
from usuarios.models import EventoGovernancaConta, SolicitacaoSuporte, SuspensaoConta, Usuario


class GovernancaContaTests(TestCase):
    SENHA = 'Senha-forte-123!'

    def setUp(self):
        self.moderador = User.objects.create_user(
            username='moderador-governanca',
            password=self.SENHA,
            is_staff=True,
        )
        Usuario.objects.create(user_auth=self.moderador, nome='Moderador', tipo='moderador')
        self.alvo = User.objects.create_user(username='leitor-governanca', password='x')
        perfil = Perfil.objects.create(usuario=self.alvo)
        Usuario.objects.create(user_auth=self.alvo, nome='Leitor', tipo='leitor', perfil=perfil)
        self.client = APIClient()
        self.client.force_authenticate(self.moderador)

    def test_moderador_suspende_por_tres_dias_com_reautenticacao_e_auditoria(self):
        resposta = self.client.post(
            f'/api/v1/dashboard/usuarios/{self.alvo.pk}/suspensao/',
            {
                'duracao_dias': 3,
                'categoria': 'conduta',
                'justificativa': 'Violação confirmada das regras da comunidade.',
                'senha_atual': self.SENHA,
            },
            format='json',
        )
        self.assertEqual(resposta.status_code, 201)
        suspensao = SuspensaoConta.objects.get(usuario=self.alvo)
        self.assertGreater(suspensao.termina_em, timezone.now())
        self.assertLessEqual((suspensao.termina_em - suspensao.inicia_em).days, 3)
        self.assertTrue(EventoGovernancaConta.objects.filter(
            usuario=self.alvo,
            tipo=EventoGovernancaConta.Tipo.SUSPENSAO_APLICADA,
        ).exists())
        self.alvo.refresh_from_db()
        self.assertTrue(self.alvo.is_active, 'A conta precisa autenticar para acessar configurações e suporte.')

    def test_duracao_fora_da_lista_e_repeticao_sao_barradas(self):
        dados = {
            'categoria': 'conduta',
            'justificativa': 'Justificativa administrativa suficientemente detalhada.',
            'senha_atual': self.SENHA,
        }
        resposta = self.client.post(
            f'/api/v1/dashboard/usuarios/{self.alvo.pk}/suspensao/',
            {**dados, 'duracao_dias': 31},
            format='json',
        )
        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(self.client.post(
            f'/api/v1/dashboard/usuarios/{self.alvo.pk}/suspensao/',
            {**dados, 'duracao_dias': 7},
            format='json',
        ).status_code, 201)
        self.assertEqual(self.client.post(
            f'/api/v1/dashboard/usuarios/{self.alvo.pk}/suspensao/',
            {**dados, 'duracao_dias': 15},
            format='json',
        ).status_code, 400)
        self.assertEqual(SuspensaoConta.objects.filter(usuario=self.alvo).count(), 1)

    def test_moderador_nao_suspende_a_si_mesmo_nem_conta_privilegiada(self):
        comum = {'duracao_dias': 3, 'categoria': 'seguranca', 'justificativa': 'Incidente de segurança confirmado.', 'senha_atual': self.SENHA}
        self.assertEqual(self.client.post(
            f'/api/v1/dashboard/usuarios/{self.moderador.pk}/suspensao/', comum, format='json'
        ).status_code, 403)
        outro = User.objects.create_user(username='outro-moderador', password='x', is_staff=True)
        Usuario.objects.create(user_auth=outro, tipo='moderador')
        self.assertEqual(self.client.post(
            f'/api/v1/dashboard/usuarios/{outro.pk}/suspensao/', comum, format='json'
        ).status_code, 403)

        superuser = User.objects.create_superuser(username='raiz-governanca', email='raiz@example.com', password=self.SENHA)
        Usuario.objects.create(user_auth=superuser, tipo='admin')
        cliente_raiz = APIClient()
        cliente_raiz.force_authenticate(superuser)
        self.assertEqual(cliente_raiz.post(
            f'/api/v1/dashboard/usuarios/{outro.pk}/suspensao/', comum, format='json'
        ).status_code, 403)

    def test_alteracao_de_papel_e_transacional_e_nao_eleva_a_moderador(self):
        usuario, evento = alterar_papel(
            ator=self.moderador,
            alvo_id=self.alvo.pk,
            novo_papel='autor',
            justificativa='Autoria validada pela equipe de moderação.',
            senha_atual=self.SENHA,
        )
        self.assertEqual(usuario.tipo, 'autor')
        self.assertEqual(evento.metadados['papel_anterior'], 'leitor')
        resposta = self.client.patch(
            f'/api/v1/dashboard/usuarios/{self.alvo.pk}/papel/',
            {'novo_papel': 'moderador', 'justificativa': 'Tentativa de elevação indevida.', 'senha_atual': self.SENHA},
            format='json',
        )
        self.assertEqual(resposta.status_code, 400)

    def test_evento_de_governanca_nao_pode_ser_editado_ou_excluido(self):
        evento = EventoGovernancaConta.objects.create(
            usuario=self.alvo,
            ator=self.moderador,
            tipo=EventoGovernancaConta.Tipo.PAPEL_ALTERADO,
            motivo='Registro imutável para auditoria.',
        )
        evento.motivo = 'alterado'
        with self.assertRaises(RuntimeError):
            evento.save()
        with self.assertRaises(RuntimeError):
            evento.delete()


class ContaSuspensaContratoTests(TestCase):
    def setUp(self):
        self.usuario = User.objects.create_user(username='suspenso-api', password='x')
        perfil = Perfil.objects.create(usuario=self.usuario)
        Usuario.objects.create(user_auth=self.usuario, tipo='leitor', perfil=perfil)
        moderador = User.objects.create_user(username='moderador-api', password='x', is_staff=True)
        Usuario.objects.create(user_auth=moderador, tipo='moderador')
        aplicar_suspensao(
            ator=moderador,
            alvo_id=self.usuario.pk,
            duracao_dias=7,
            categoria='conduta',
            justificativa='Suspensão controlada para teste do contrato.',
            senha_atual='x',
        )
        token = RefreshToken.for_user(self.usuario).access_token
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_perfil_de_sessao_expoe_prazo_e_acao_pessoal_e_bloqueada(self):
        perfil = self.client.get('/api/v1/perfis/meu-perfil/')
        self.assertEqual(perfil.status_code, 200)
        self.assertTrue(perfil.data['suspensao']['ativa'])
        bloqueada = self.client.get('/api/v1/biblioteca/estante/')
        self.assertEqual(bloqueada.status_code, 403)
        self.assertEqual(bloqueada.data['codigo'], 'conta_suspensa')

    def test_conteudo_publico_e_calculado_como_visitante(self):
        resposta = self.client.get('/api/v1/biblioteca/livros/')
        self.assertEqual(resposta.status_code, 200)

    def test_suporte_e_configuracao_continuam_disponiveis(self):
        resposta = self.client.post('/api/v1/auth/suporte/', {
            'assunto': 'Revisão da suspensão',
            'mensagem': 'Solicito a revisão dos fundamentos associados ao protocolo.',
        }, format='json')
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(SolicitacaoSuporte.objects.filter(usuario=self.usuario).count(), 1)
        preferencias = self.client.patch('/api/v1/auth/preferencias-notificacao/', {
            'notificacoes_comunidades': False,
        }, format='json')
        self.assertEqual(preferencias.status_code, 200)


class MigracaoModeradoresTests(TestCase):
    def test_migracao_direta_e_reversa_preserva_superusuario(self):
        comum = User.objects.create_user(username='admin-legado', is_staff=True)
        superuser = User.objects.create_superuser(username='admin-raiz', email='raiz@example.com', password='x')
        Usuario.objects.create(user_auth=comum, tipo='admin')
        Usuario.objects.create(user_auth=superuser, tipo='admin')
        migration = import_module('usuarios.migrations.0008_alter_usuario_tipo_eventogovernancaconta_and_more')
        editor = SimpleNamespace(connection=SimpleNamespace(alias='default'))
        from django.apps import apps
        migration.promover_admins_operacionais_a_moderadores(apps, editor)
        self.assertEqual(Usuario.objects.get(user_auth=comum).tipo, 'moderador')
        self.assertEqual(Usuario.objects.get(user_auth=superuser).tipo, 'admin')
        futuro = User.objects.create_user(username='moderador-futuro', is_staff=True)
        Usuario.objects.create(user_auth=futuro, tipo='moderador')
        migration.restaurar_moderadores_como_admins(apps, editor)
        self.assertEqual(Usuario.objects.get(user_auth=comum).tipo, 'admin')
        self.assertEqual(Usuario.objects.get(user_auth=futuro).tipo, 'moderador')
