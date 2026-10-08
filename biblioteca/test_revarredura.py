from datetime import timedelta
from io import StringIO
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from threading import Event

from django.test import SimpleTestCase, TestCase, TransactionTestCase, override_settings
from django.core.management import call_command
from django.db import close_old_connections, connections
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from biblioteca.quarentena import (
    ContextoVarredura, ResultadoVarredura, abrir_pdf_verificado, arquivo_liberado, contexto_atual, verificar_arquivo,
)
from biblioteca import test_quarentena as fixtures


@override_settings(BOOK_FILE_SCAN_REQUIRED=True, BOOK_CLAMSCAN_PATH='')
class RevarreduraTests(TestCase):
    setUp = fixtures.QuarentenaTests.setUp

    def test_cli_varre_amostra_da_tentativa_sem_liberar_pdf_ou_publicar(self):
        tentativa = self.livro.solicitacao_publicacao.tentativas.get()
        tentativa.pdf_amostra.save('amostra-tentativa.pdf', fixtures.pdf(), save=True)
        from biblioteca.quarentena import ClamAVScanner
        with patch.object(ClamAVScanner, 'verificar', return_value=ResultadoVarredura('limpo', self.contexto.motor_versao)):
            saida = StringIO()
            call_command('verificar_pdf', tentativa_id=tentativa.pk, amostra=True, stdout=saida)
        self.assertTrue(arquivo_liberado(tentativa.pdf_amostra))
        self.assertFalse(arquivo_liberado(tentativa.pdf))
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.status, 'pendente')
        self.assertIn('publicação não alterada', saida.getvalue())

    def test_desativar_rollout_nao_libera_arquivo_conhecidamente_rejeitado(self):
        self.scanner.verificar.return_value = ResultadoVarredura('rejeitado', self.contexto.motor_versao)
        verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        with override_settings(BOOK_FILE_SCAN_REQUIRED=False):
            self.assertFalse(arquivo_liberado(self.livro.pdf))
            with self.assertRaises(PermissionDenied):
                abrir_pdf_verificado(self.livro.pdf)
    def test_assinaturas_novas_invalidam_mesmo_hash_e_exigem_nova_varredura(self):
        antigo = verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        self.context_mock.return_value = ContextoVarredura(self.contexto.motor_versao, 'b' * 64)
        self.assertFalse(arquivo_liberado(self.livro.pdf))
        with self.assertRaises(PermissionDenied):
            abrir_pdf_verificado(self.livro.pdf)
        novo = verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        self.assertNotEqual(novo.tentativa, antigo.tentativa)
        self.assertEqual(self.scanner.verificar.call_count, 2)

    def test_resultado_expirado_revoga_e_revarre(self):
        registro = verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        registro.valido_ate = timezone.now() - timedelta(seconds=1)
        registro.save()
        self.assertFalse(arquivo_liberado(self.livro.pdf))
        verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        self.assertEqual(self.scanner.verificar.call_count, 2)
        self.assertTrue(arquivo_liberado(self.livro.pdf))

    def test_assinaturas_indisponiveis_revogam_resultado_e_nao_chamam_motor(self):
        verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        self.context_mock.return_value = None
        self.assertFalse(arquivo_liberado(self.livro.pdf))
        self.assertEqual(verificar_arquivo(self.livro.pdf, scanner=self.scanner).estado, 'erro')
        self.assertEqual(self.scanner.verificar.call_count, 1)

    def test_mudanca_durante_varredura_nao_confirma_resultado_anterior(self):
        def alterar(_conteudo):
            self.context_mock.return_value = ContextoVarredura(self.contexto.motor_versao, 'c' * 64)
            return ResultadoVarredura('limpo', self.contexto.motor_versao)
        self.scanner.verificar.side_effect = alterar
        self.assertEqual(verificar_arquivo(self.livro.pdf, scanner=self.scanner).estado, 'erro')
        self.assertFalse(arquivo_liberado(self.livro.pdf))


class AssinaturasTests(SimpleTestCase):
    def test_banco_de_ensaio_explicito_fingerprint_e_falha_fechada(self):
        with tempfile.TemporaryDirectory() as pasta:
            motor = Path(pasta) / 'motor-sintetico.exe'
            motor.write_bytes(b'somente fixture')
            banco = Path(pasta) / 'assinaturas'
            banco.mkdir()
            assinatura = banco / 'teste.ndb'
            assinatura.write_text('assinatura-sintetica', encoding='utf-8')
            with override_settings(BOOK_CLAMSCAN_PATH=str(motor), BOOK_SCAN_DATABASE_DIR=str(banco),
                                   DEBUG=True, BOOK_SCAN_ALLOW_TEST_DATABASE=True), \
                    patch('biblioteca.quarentena.subprocess.run', return_value=SimpleNamespace(stdout='ClamAV sintético')):
                primeiro = contexto_atual()
                self.assertIsNotNone(primeiro)
                assinatura.write_text('assinatura-sintetica-alterada', encoding='utf-8')
                self.assertNotEqual(contexto_atual().assinaturas_sha256, primeiro.assinaturas_sha256)
                with override_settings(DEBUG=False):
                    self.assertIsNone(contexto_atual())
                with override_settings(BOOK_SCAN_ALLOW_TEST_DATABASE=False):
                    self.assertIsNone(contexto_atual())
                antigo = (timezone.now() - timedelta(days=5)).timestamp()
                os.utime(assinatura, (antigo, antigo))
                self.assertIsNone(contexto_atual())


@override_settings(BOOK_FILE_SCAN_REQUIRED=True, BOOK_CLAMSCAN_PATH='')
class ConcorrenciaVarreduraTests(TransactionTestCase):
    setUp = fixtures.QuarentenaTests.setUp

    def test_resultado_lento_nao_sobrescreve_rejeicao_mais_recente(self):
        iniciado, liberar = Event(), Event()
        arquivo = self.livro.pdf
        class Lento:
            def verificar(_scanner, conteudo):
                iniciado.set()
                if not liberar.wait(10):
                    raise TimeoutError()
                return ResultadoVarredura('limpo', self.contexto.motor_versao)
        class Atual:
            def verificar(_scanner, conteudo):
                return ResultadoVarredura('rejeitado', self.contexto.motor_versao)
        def executar(scanner):
            close_old_connections()
            try:
                return verificar_arquivo(arquivo, scanner=scanner).estado
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futuro = pool.submit(executar, Lento())
            try:
                self.assertTrue(iniciado.wait(10))
                self.assertEqual(executar(Atual()), 'rejeitado')
            finally:
                liberar.set()
            self.assertEqual(futuro.result(timeout=15), 'rejeitado')
        self.assertFalse(arquivo_liberado(arquivo))

    def test_daily_usa_data_da_assinatura_e_nao_toque_no_arquivo(self):
        with tempfile.TemporaryDirectory() as pasta:
            motor = Path(pasta) / 'motor'
            motor.write_bytes(b'fixture')
            cabecalho = f'ClamAV-VDB:data:1:1:1:md5:assinatura:builder:{int((timezone.now() - timedelta(days=5)).timestamp())}'
            (Path(pasta) / 'daily.cvd').write_bytes(cabecalho.encode().ljust(512))
            with override_settings(BOOK_CLAMSCAN_PATH=str(motor), BOOK_SCAN_DATABASE_DIR=pasta):
                self.assertIsNone(contexto_atual())
