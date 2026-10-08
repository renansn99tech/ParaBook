from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch
from uuid import uuid4

from django.conf import settings
from django.contrib.auth.models import User
from django.db import close_old_connections, connections
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from perfis.models import Perfil
from usuarios.governanca import aplicar_suspensao
from usuarios.idade import registrar_declaracao, resumo_estado, restricao_etaria_ativa
from usuarios.models import AuditoriaAcao, EstadoEtarioConta, EventoEtarioConta, ProvaPrivacidade, RevisaoEtaria, SolicitacaoSuporte, Usuario
from usuarios.privacidade_exportacao import exportar_dados


POLITICA = dict(AGE_POLICY_ACTIVE=True, AGE_POLICY_ROLLOUT_AT='2026-09-01T00:00:00-03:00', AGE_POLICY_VERSION='idade-g2-teste')
HOJE = date(2026, 10, 6)


@override_settings(**POLITICA)
class RevisaoEtariaTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='titular-etario', password='sintetica')
        self.user.date_joined = timezone.now() - timedelta(days=8)
        self.user.save(update_fields=['date_joined'])
        perfil = Perfil.objects.create(usuario=self.user)
        self.negocio = Usuario.objects.create(user_auth=self.user, perfil=perfil, termos_aceitos=True,
                                             versao_termos_aceita=settings.TERMS_VERSION)
        self.admin = User.objects.create_superuser(username='operador-etario', password='sintetica')
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(self.user).access_token}')
        self.operador = APIClient()
        self.operador.force_authenticate(self.admin)
        self.url = reverse('api_idade_revisao')

    def declarar(self, data):
        with patch('usuarios.idade.timezone.localdate', return_value=HOJE):
            return registrar_declaracao(usuario_auth=self.user, data_nascimento=data,
                                        chave_idempotencia=uuid4(), origem='web')

    def pedir(self, chave=None):
        return self.client.post(self.url, {'mensagem': 'Preciso de orientação para corrigir minha declaração.',
                                          'chave_idempotencia': str(chave or uuid4())}, format='json')

    def decidir(self, item, acao='iniciar', **dados):
        return self.operador.post(reverse('api-dashboard-suporte-idade', args=[item]), {
            'acao': acao, 'resposta': 'Orientação registrada para o titular acompanhar neste protocolo.',
            'senha_atual': 'sintetica', 'chave_idempotencia': str(uuid4()), **dados,
        }, format='json')

    def test_aniversario_atualiza_uma_vez_sem_correcoes_ou_vazamento(self):
        with patch('usuarios.idade.timezone.localdate', return_value=date(2026, 10, 5)):
            registrar_declaracao(usuario_auth=self.user, data_nascimento=date(2008, 10, 6), chave_idempotencia=uuid4(), origem='web')
        with patch('usuarios.idade.timezone.localdate', return_value=HOJE):
            primeiro = resumo_estado(self.user)
            self.assertFalse(primeiro['restricao_ativa'])
            self.assertEqual(primeiro['estado'], 'liberado_adulto')
            resumo_estado(self.user)
        self.assertEqual(EventoEtarioConta.objects.filter(tipo='mudanca_de_faixa').count(), 1)
        self.assertEqual(primeiro['declaracoes_sucesso'], 1)
        self.assertNotIn('2008-10-06', str(primeiro))
        evento = EventoEtarioConta.objects.get(tipo='mudanca_de_faixa')
        self.assertTrue(ProvaPrivacidade.objects.filter(evento_ref=evento.protocolo, classe='R10').exists())

    def test_fronteira_usa_o_dia_local_em_brasilia(self):
        self.declarar(date(2008, 10, 7))
        with timezone.override('America/Belem'), patch('django.utils.timezone.now', return_value=datetime(2026, 10, 7, 2, 59, tzinfo=dt_timezone.utc)):
            self.assertTrue(restricao_etaria_ativa(self.user)[0])
        with timezone.override('America/Belem'), patch('django.utils.timezone.now', return_value=datetime(2026, 10, 7, 3, tzinfo=dt_timezone.utc)):
            self.assertFalse(restricao_etaria_ativa(self.user)[0])

    def test_transicao_sem_chave_mantem_restricao_e_nao_grava_evento(self):
        self.declarar(date(2008, 10, 7))
        with override_settings(PRIVACY_EVIDENCE_KEY=''), patch('usuarios.idade.timezone.localdate', return_value=date(2026, 10, 7)):
            self.assertTrue(restricao_etaria_ativa(self.user)[0])
        self.assertFalse(EventoEtarioConta.objects.filter(tipo='mudanca_de_faixa').exists())
        self.assertEqual(EstadoEtarioConta.objects.get(usuario=self.user).estado, 'restrito_menor')

    def test_flag_inativa_nao_muda_faixa_por_acesso(self):
        self.declarar(date(2008, 10, 7))
        with override_settings(AGE_POLICY_ACTIVE=False), patch('usuarios.idade.timezone.localdate', return_value=date(2026, 10, 8)):
            self.assertFalse(restricao_etaria_ativa(self.user)[0])
        self.assertEqual(EstadoEtarioConta.objects.get(usuario=self.user).estado, 'restrito_menor')

    def test_protocolo_reusa_fila_automatica_e_retenta_sem_duplicar(self):
        self.declarar(date(2012, 1, 1))
        chave = uuid4()
        primeira = self.pedir(chave)
        self.assertEqual(primeira.status_code, 200)
        self.assertEqual(self.pedir(chave).data['protocolo'], primeira.data['protocolo'])
        self.assertEqual(self.pedir().data['protocolo'], primeira.data['protocolo'])
        self.assertEqual(self.user.solicitacoes_suporte.count(), 1)
        self.assertEqual(RevisaoEtaria.objects.count(), 1)
        self.assertEqual(primeira['Cache-Control'], 'no-store')

    def test_titular_so_consulta_os_proprios_protocolos_e_nao_decide(self):
        item = self.pedir().data['id']
        outro = User.objects.create_user(username='outro-titular')
        SolicitacaoSuporte.objects.create(usuario=outro, categoria='idade', assunto='Outro caso', mensagem='privado')
        resposta = self.client.get(self.url)
        self.assertEqual([i['id'] for i in resposta.data], [item])
        negada = self.client.post(reverse('api-dashboard-suporte-idade', args=[item]), {}, format='json')
        self.assertEqual(negada.status_code, 403)

    def test_chave_de_outro_titular_nao_revela_protocolo(self):
        chave = uuid4()
        self.pedir(chave)
        outro = User.objects.create_user(username='outro-chave')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(outro).access_token}')
        resposta = self.pedir(chave)
        self.assertEqual(resposta.status_code, 400)
        self.assertNotIn('protocolo', resposta.data)

    def test_reautenticacao_obrigatoria_e_sem_decisao_antecipada(self):
        item = self.pedir().data['id']
        self.assertEqual(self.decidir(item, senha_atual='errada').status_code, 400)
        self.assertEqual(self.decidir(item, 'confirmar_declaracao').status_code, 400)
        self.assertFalse(EventoEtarioConta.objects.filter(solicitacao_id=item, tipo='revisao_iniciada').exists())

    def test_menor_confirmado_continua_restrito_e_cooldown_preservado(self):
        self.declarar(date(2011, 1, 1)); self.declarar(date(2012, 1, 1))
        antes = EstadoEtarioConta.objects.get(usuario=self.user)
        item = self.pedir().data['id']
        self.assertEqual(self.decidir(item).status_code, 200)
        self.assertEqual(self.decidir(item, 'confirmar_declaracao').status_code, 200)
        depois = EstadoEtarioConta.objects.get(usuario=self.user)
        self.assertEqual(depois.estado, 'restrito_menor')
        self.assertEqual(depois.declaracoes_sucesso, antes.declaracoes_sucesso)
        self.assertEqual(depois.proxima_correcao_permitida_em, antes.proxima_correcao_permitida_em)
        self.assertTrue(restricao_etaria_ativa(self.user)[0])
        self.assertEqual(self.client.put(reverse('api_idade'), {'data_nascimento': '1990-01-01', 'chave_idempotencia': str(uuid4())}, format='json').status_code, 400)

    def test_correcao_adulta_em_analise_nao_encerra_revisao(self):
        self.declarar(date(2012, 1, 1))
        item = self.pedir().data['id']
        self.decidir(item)
        self.declarar(date(1990, 1, 1))
        self.assertTrue(restricao_etaria_ativa(self.user)[0])
        self.assertEqual(EstadoEtarioConta.objects.get(usuario=self.user).estado, 'em_revisao')
        self.assertEqual(self.decidir(item, 'confirmar_declaracao').status_code, 200)
        self.assertFalse(restricao_etaria_ativa(self.user)[0])

    def test_aniversario_nao_encerra_revisao_em_andamento(self):
        self.declarar(date(2008, 10, 7))
        # A revisão começa antes do aniversário, independentemente do dia da suíte.
        with patch('usuarios.idade.timezone.localdate', return_value=HOJE):
            self.decidir(self.pedir().data['id'])
        with patch('usuarios.idade.timezone.localdate', return_value=date(2026, 10, 8)):
            self.assertTrue(restricao_etaria_ativa(self.user)[0])
        self.assertFalse(EventoEtarioConta.objects.filter(tipo='mudanca_de_faixa').exists())

    def test_pendente_nao_ganha_sete_dias_ao_encerrar_orientacao(self):
        item = self.pedir().data['id']
        self.decidir(item)
        self.assertEqual(self.decidir(item, 'confirmar_declaracao').status_code, 400)
        self.assertEqual(self.decidir(item, 'orientar_correcao').status_code, 200)
        self.assertTrue(restricao_etaria_ativa(self.user)[0])
        self.assertEqual(EstadoEtarioConta.objects.get(usuario=self.user).estado, 'pendente')

    def test_decisao_idempotente_e_motivo_na_auditoria_minima(self):
        self.declarar(date(2012, 1, 1))
        item = self.pedir().data['id']
        chave = str(uuid4())
        self.assertEqual(self.decidir(item, chave_idempotencia=chave).status_code, 200)
        self.assertEqual(self.decidir(item, chave_idempotencia=chave).status_code, 200)
        self.assertEqual(EventoEtarioConta.objects.filter(solicitacao_id=item, tipo='revisao_iniciada').count(), 1)
        log = AuditoriaAcao.objects.get(acao='idade.revisao_decidida')
        self.assertEqual(log.ator, self.admin)
        self.assertNotIn('resposta', log.metadados)
        self.assertNotIn('data_nascimento', log.metadados)

    def test_suporte_generico_nao_contorna_rito_e_reusa_fila(self):
        item = self.pedir().data['id']
        resposta = self.operador.patch(reverse('api-dashboard-suporte-item', args=[item]), {'resposta': 'Resposta sem rito etário', 'status': 'encerrada'}, format='json')
        self.assertEqual(resposta.status_code, 400)
        self.client.post(reverse('api_suporte'), {'categoria': 'idade', 'assunto': 'Revisar declaração', 'mensagem': 'Preciso de orientação para minha declaração.'}, format='json')
        self.assertEqual(self.user.solicitacoes_suporte.count(), 1)

    def test_chave_de_revisao_nao_pode_ser_usada_para_declarar(self):
        item = self.pedir().data['id']
        chave = str(uuid4()); self.decidir(item, chave_idempotencia=chave)
        resposta = self.client.put(reverse('api_idade'), {'data_nascimento': '1990-01-01', 'chave_idempotencia': chave}, format='json')
        self.assertEqual(resposta.status_code, 400)

    def test_sem_chave_ou_auditoria_decisao_tem_rollback(self):
        item = self.pedir().data['id']
        with override_settings(PRIVACY_EVIDENCE_KEY=''):
            self.assertEqual(self.decidir(item).status_code, 400)
        with patch('usuarios.revisao_etaria.registrar_acao', return_value=None):
            self.assertEqual(self.decidir(item).status_code, 400)
        self.assertEqual(SolicitacaoSuporte.objects.get(pk=item).status, 'aberta')
        self.assertFalse(EventoEtarioConta.objects.filter(solicitacao_id=item, tipo='revisao_iniciada').exists())

    def test_encerrada_e_privilegiada_nao_sao_liberadas_pelo_painel(self):
        item = self.pedir().data['id']
        self.user.is_active = False; self.user.save(update_fields=['is_active'])
        self.assertEqual(self.decidir(item).status_code, 400)
        self.user.is_active = True; self.user.is_staff = True; self.user.save(update_fields=['is_active', 'is_staff'])
        self.assertEqual(self.decidir(item).status_code, 403)

    def test_suspensao_independente_permanece_apos_decisao_adulta(self):
        self.declarar(date(1990, 1, 1))
        item = self.pedir().data['id']; self.decidir(item)
        aplicar_suspensao(ator=self.admin, alvo_id=self.user.pk, senha_atual='sintetica', duracao_dias=3,
                         categoria='conduta', justificativa='Caso sintético para conferir barreiras independentes.')
        self.assertEqual(self.decidir(item, 'confirmar_declaracao').status_code, 200)
        bloqueada = self.client.get(reverse('livro-list'))
        # Catálogo público permanece disponível; a ação autenticada é bloqueada.
        self.assertEqual(bloqueada.status_code, 200)
        resposta = self.client.get('/api/v1/biblioteca/estante/')
        self.assertEqual(resposta.status_code, 403)
        self.assertEqual(resposta.data['codigo'], 'conta_suspensa')

    def test_exportacao_nao_acrescenta_identidade_do_operador(self):
        item = self.pedir().data['id']; self.decidir(item)
        dados = exportar_dados(self.user)
        self.assertNotIn('ator_id', str(dados['categorias']['T03']))
        self.assertNotIn('operador-etario', str(dados))

    def test_retenta_pedido_reusado_apos_conclusao_sem_criar_outro(self):
        item = self.pedir().data['id']
        chave = uuid4()
        self.assertEqual(self.pedir(chave).data['id'], item)
        self.decidir(item); self.decidir(item, 'orientar_correcao')
        self.assertEqual(self.pedir(chave).data['id'], item)
        self.assertEqual(self.user.solicitacoes_suporte.count(), 1)

    def test_fila_antiga_em_analise_admite_inicio_do_rito(self):
        item = SolicitacaoSuporte.objects.create(usuario=self.user, categoria='idade',
                                                assunto='Protocolo anterior', mensagem='Caso anterior', status='em_analise')
        self.assertEqual(self.decidir(item.pk).status_code, 200)
        self.assertEqual(EstadoEtarioConta.objects.get(usuario=self.user).estado, 'em_revisao')

    def test_nao_inicia_duas_analises_para_mesma_conta(self):
        item = self.pedir().data['id']; self.decidir(item)
        segundo = SolicitacaoSuporte.objects.create(usuario=self.user, categoria='idade',
                                                    assunto='Duplicado histórico', mensagem='Caso anterior')
        self.assertEqual(self.decidir(segundo.pk).status_code, 400)

    def test_data_enviada_pelo_operador_nao_muda_declaracao_privada(self):
        self.declarar(date(2012, 1, 1))
        item = self.pedir().data['id']; self.decidir(item)
        self.assertEqual(self.decidir(item, 'confirmar_declaracao', data_nascimento='1990-01-01').status_code, 200)
        self.negocio.refresh_from_db()
        self.assertEqual(self.negocio.data_nascimento_eligibilidade, date(2012, 1, 1))
        self.assertTrue(restricao_etaria_ativa(self.user)[0])


@override_settings(**POLITICA)
class MaioridadeConcorrenciaTests(TransactionTestCase):
    def test_requisicoes_paralelas_gravam_um_evento_de_maioridade(self):
        user = User.objects.create_user(username='aniversario-concorrente')
        Usuario.objects.create(user_auth=user, data_nascimento_eligibilidade=date(1990, 1, 1))
        EstadoEtarioConta.objects.create(usuario=user, estado='restrito_menor', declaracoes_sucesso=2,
                                        proxima_correcao_permitida_em=timezone.now() + timedelta(days=5))
        def consultar(_):
            close_old_connections()
            try:
                return resumo_estado(User.objects.get(pk=user.pk))['restricao_ativa']
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=3) as executor:
            resultados = list(executor.map(consultar, range(3)))
        self.assertEqual(resultados, [False, False, False])
        self.assertEqual(EventoEtarioConta.objects.filter(tipo='mudanca_de_faixa').count(), 1)
        self.assertEqual(EstadoEtarioConta.objects.get(usuario=user).declaracoes_sucesso, 2)
