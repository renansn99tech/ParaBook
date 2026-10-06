from datetime import date, datetime
from django.test import SimpleTestCase, TestCase
from django.contrib.auth.models import User
from usuarios.models import SolicitacaoSuporte
from usuarios.operacao_moderacao import (
    BRASILIA, CalendarioAtendimento, conferir_conselho, fila_pendente, prazos_caso, validar_ficha,
)


class RelogioModeracaoTests(SimpleTestCase):
    def setUp(self):
        self.calendario = CalendarioAtendimento(date(2026, 10, 1), date(2026, 11, 30),
                                               frozenset({date(2026, 10, 12)}), 'calendario-sintetico')

    def test_p0_conta_somente_horario_regular_incluindo_sabado(self):
        recebido = datetime(2026, 10, 9, 17, tzinfo=BRASILIA)
        prazos = prazos_caso(recebido_em=recebido, prioridade='P0', calendario=self.calendario)
        self.assertEqual(prazos['triagem_ate'], datetime(2026, 10, 10, 15, tzinfo=BRASILIA))

    def test_p1_nao_conta_domingo_nem_feriado_e_preserva_hora_util(self):
        recebido = datetime(2026, 10, 10, 14, tzinfo=BRASILIA)
        prazos = prazos_caso(recebido_em=recebido, prioridade='P1', calendario=self.calendario)
        self.assertEqual(prazos['confirmacao_humana_ate'], datetime(2026, 10, 13, 14, tzinfo=BRASILIA))

    def test_p2_tem_tres_dias_para_triagem_e_quinze_para_decisao(self):
        recebido = datetime(2026, 10, 5, 9, tzinfo=BRASILIA)
        prazos = prazos_caso(recebido_em=recebido, prioridade='P2', calendario=self.calendario)
        self.assertEqual(prazos['triagem_ate'], datetime(2026, 10, 8, 9, tzinfo=BRASILIA))
        self.assertGreater(prazos['decisao_ate'], prazos['triagem_ate'])

    def test_calendario_nao_conferido_ou_p3_nao_ganha_prazo_inventado(self):
        with self.assertRaises(ValueError):
            self.calendario.somar_dias(datetime(2026, 12, 1, tzinfo=BRASILIA), 1)
        with self.assertRaises(ValueError):
            prazos_caso(recebido_em=datetime(2026, 10, 1, tzinfo=BRASILIA), prioridade='P3', calendario=self.calendario)

    def test_ausencia_e_envio_sem_recibo_nao_completam_procedimento(self):
        ficha = {'protocolo': 'PB-MOD-2026-901', 'prioridade': 'P0'}
        with self.assertRaises(ValueError): validar_ficha(ficha)
        ficha.update(responsavel='operador-sintetico', comunicado_em=datetime(2026, 10, 5, tzinfo=BRASILIA))
        with self.assertRaises(ValueError): validar_ficha(ficha)

    def test_exclusao_e_recurso_fora_do_escopo_nao_sao_executados(self):
        ficha = {'protocolo': 'PB-MOD-2026-901', 'prioridade': 'P2', 'responsavel': 'operador-sintetico'}
        with self.assertRaises(ValueError): validar_ficha({**ficha, 'recurso_tipo': 'rejeicao_publicacao'})
        with self.assertRaises(ValueError): validar_ficha({**ficha, 'exclusao_definitiva': True})

    def test_conselho_nao_aceita_mesmo_aprovador_ou_trava_e_nunca_executa(self):
        with self.assertRaises(ValueError):
            conferir_conselho(aprovacoes=['A', 'A'], reautenticadas=['A'], travas={})
        with self.assertRaises(ValueError):
            conferir_conselho(aprovacoes=['A', 'B'], reautenticadas=['A', 'B'], travas={'recurso': True})
        self.assertFalse(conferir_conselho(aprovacoes=['A', 'B'], reautenticadas=['A', 'B'],
                                         travas={chave: False for chave in
                                                 ['recurso', 'retencao', 'incidente', 'ordem_autoridade', 'preservacao']})['executado'])


class FilaModeracaoTests(TestCase):
    def test_fila_preserva_falta_de_triagem_e_nao_expoe_texto_contato_ou_nome(self):
        user = User.objects.create_user(username='sintetico-nao-expor')
        SolicitacaoSuporte.objects.create(usuario=user, assunto='Assunto privado', mensagem='Mensagem privada')
        fila = fila_pendente()
        self.assertEqual(len(fila), 1)
        self.assertIsNone(fila[0]['prioridade'])
        self.assertIsNone(fila[0]['responsavel'])
        self.assertNotIn('privad', str(fila))
        self.assertNotIn(user.username, str(fila))
