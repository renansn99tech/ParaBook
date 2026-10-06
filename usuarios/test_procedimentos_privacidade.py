from datetime import datetime, timedelta, timezone
from django.test import SimpleTestCase
from usuarios.procedimentos_privacidade import (
    AcessoExcepcional, EtapaDestino, IncidentePrivacidade, checklist_ausencia,
    fechamento, prazo_dias_uteis,
)
from usuarios.retencao import limite_retencao


class ProcedimentosPrivacidadeTests(SimpleTestCase):
    INICIO = datetime(2026, 10, 2, 12, tzinfo=timezone.utc)

    def test_fechamento_parcial_exige_proxima_acao_e_nao_declara_revogacao(self):
        etapas = [EtapaDestino('sessao', 'concluido', evidencia_ref='ensaio-1'),
            EtapaDestino('permissao', 'impedido', motivo_codigo='fornecedor_sem_temporario', proxima_acao='conter_sessao', revisar_em=self.INICIO)]
        self.assertEqual(fechamento(etapas), {'estado': 'parcial', 'destinos_residuais': ['permissao']})
        with self.assertRaises(ValueError):
            fechamento([EtapaDestino('copias', 'impedido', motivo_codigo='sem_acesso')])
        with self.assertRaises(ValueError):
            fechamento([EtapaDestino('storage', 'concluido')])

    def test_janela_expirada_e_operacao_fora_do_escopo_sao_interrompidas(self):
        acesso = AcessoExcepcional('PB-ACE-2026-001', self.INICIO, self.INICIO + timedelta(hours=2),
            'local_sintetico', 'caso-1', ('consultar',))
        acesso.conferir_operacao(agora=self.INICIO, ambiente='local_sintetico', recurso='caso-1', operacao='consultar')
        for agora, recurso, operacao in ((acesso.fim, 'caso-1', 'consultar'), (self.INICIO, 'caso-2', 'consultar'), (self.INICIO, 'caso-1', 'exportar')):
            with self.subTest(agora=agora, operacao=operacao):
                with self.assertRaises(ValueError):
                    acesso.conferir_operacao(agora=agora, ambiente='local_sintetico', recurso=recurso, operacao=operacao)

    def test_renovacao_exige_novo_protocolo_e_emergencia_revisao_24h(self):
        acesso = AcessoExcepcional('PB-ACE-2026-002', self.INICIO, self.INICIO + timedelta(hours=1),
            'local_sintetico', 'caso-1', ('conter',), anterior='PB-ACE-2026-001', emergencia=True)
        acesso.validar()
        self.assertEqual(acesso.revisar_em, self.INICIO + timedelta(hours=24))
        repetido = AcessoExcepcional('PB-ACE-2026-001', self.INICIO, acesso.fim, 'local_sintetico', 'caso-1', ('consultar',), anterior='PB-ACE-2026-001')
        with self.assertRaises(ValueError):
            repetido.validar()

    def test_incidente_ativo_contem_imediatamente_e_registro_dura_5_anos(self):
        incidente = IncidentePrivacidade('PB-INC-2026-001', self.INICIO, self.INICIO, True, 'incidente_confirmado', 'alto', 'comunicar')
        self.assertEqual(incidente.triagem_ate, self.INICIO)
        self.assertEqual(incidente.registro_ate.year, 2031)
        with self.assertRaises(ValueError):
            incidente.comunicacao_ate()
        prazo = incidente.comunicacao_ate(feriados=(), calendario_conferido=True)
        self.assertEqual(prazo.isoformat(), '2026-10-07')
        prazo = incidente.comunicacao_ate(feriados=(datetime(2026, 10, 5).date(),), calendario_conferido=True)
        self.assertEqual(prazo.isoformat(), '2026-10-08')

    def test_alerta_e_comunicacao_impedida_nao_viram_incidente_resolvido(self):
        alerta = IncidentePrivacidade('PB-INC-2026-002', self.INICIO)
        self.assertEqual(alerta.triagem_ate, self.INICIO + timedelta(hours=24))
        self.assertIsNone(alerta.comunicacao_ate())
        resultado = fechamento([EtapaDestino('comunicacao_anpd', 'impedido', motivo_codigo='canal_indisponivel',
            proxima_acao='restabelecer_canal', revisar_em=self.INICIO + timedelta(hours=1))])
        self.assertEqual(resultado['estado'], 'parcial')

    def test_ausencia_explicitada_sem_delegacao_ou_capacidade_inventada(self):
        resultado = checklist_ausencia(casos=[{'protocolo': 'PB-LGPD-2026-001', 'prazo': self.INICIO,
            'proxima_acao': 'verificar_identidade'}], controlador_disponivel=False, agora=self.INICIO)
        self.assertEqual(resultado['prazos_em_risco'], ['PB-LGPD-2026-001'])
        self.assertFalse(resultado['delegacao_automatica'])

    def test_prazos_calendarios_r10_exportacao_e_backup(self):
        bissexto = datetime(2024, 2, 29, tzinfo=timezone.utc)
        self.assertEqual(limite_retencao('R10', bissexto).date().isoformat(), '2026-02-28')
        self.assertEqual(limite_retencao('EXPORT', self.INICIO), self.INICIO + timedelta(days=7))
        self.assertEqual(limite_retencao('BACKUP_DIARIO', self.INICIO), self.INICIO + timedelta(days=7))
        self.assertEqual(limite_retencao('BACKUP_SEMANAL', self.INICIO), self.INICIO + timedelta(days=30))
