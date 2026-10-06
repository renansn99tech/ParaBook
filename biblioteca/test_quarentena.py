from datetime import timedelta
from types import SimpleNamespace
import os
from unittest.mock import Mock, patch
import subprocess

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIClient

from biblioteca import publicacao as fluxo
from biblioteca.models import Categoria, Livro, VerificacaoArquivo
from biblioteca.quarentena import ClamAVScanner, ResultadoVarredura, arquivo_liberado, verificar_arquivo
from biblioteca.services import verificar_acesso_obra
from biblioteca.test_publicacao import pdf, usuario
from usuarios.privacidade_arquivos import abrir_arquivo_proprio


@override_settings(BOOK_FILE_SCAN_REQUIRED=True, BOOK_CLAMSCAN_PATH='')
class QuarentenaTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome='Quarentena sintética')
        self.autor = usuario('quarentena-autor', 'autor')
        self.admin = usuario('quarentena-admin', 'admin', True)
        self.leitor = User.objects.create_user(username='quarentena-leitor')
        self.livro = fluxo.enviar_obra(self.autor, {
            'titulo': 'PDF sintético', 'categoria': self.categoria, 'pdf': pdf(),
            'cpf_autor': '12345678901', 'declaracao_autoria': True, 'aceitou_termos': True,
        })
        self.scanner = Mock()
        self.scanner.verificar.return_value = ResultadoVarredura('limpo', 'motor-sintetico/assinatura-901')

    def test_upload_entra_em_area_privada_e_quarentena_sem_publicar(self):
        self.assertTrue(self.livro.pdf.name.startswith('livros/quarentena/'))
        self.assertEqual(VerificacaoArquivo.objects.get(arquivo_nome=self.livro.pdf.name).estado, 'quarentena')
        self.assertFalse(arquivo_liberado(self.livro.pdf))
        self.assertEqual(self.livro.status, 'pendente')

    def test_aprovacao_e_arquivo_proprio_nao_contornam_quarentena(self):
        with self.assertRaises(PermissionDenied):
            fluxo.analisar_publicacao(self.admin, self.livro.solicitacao_publicacao.pk, 'aprovar')
        with self.assertRaises(PermissionDenied):
            abrir_arquivo_proprio(titular=self.autor, tipo='obra', recurso_id=self.livro.pk, campo='pdf')
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.status, 'pendente')

    def test_motor_sintetico_limpo_permite_aprovar_sem_afirmar_antimalware_real(self):
        resultado = verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        self.assertEqual(resultado.estado, 'limpo')
        self.assertTrue(arquivo_liberado(self.livro.pdf))
        fluxo.analisar_publicacao(self.admin, self.livro.solicitacao_publicacao.pk, 'aprovar')
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.status, 'publicado')

    def test_repeticao_de_resultado_terminal_e_idempotente(self):
        primeiro = verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        segundo = verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        self.assertEqual(primeiro.tentativa, segundo.tentativa)
        self.scanner.verificar.assert_called_once()

    def test_conteudo_alterado_na_mesma_chave_revoga_resultado_limpo(self):
        verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        self.livro.pdf.storage.delete(self.livro.pdf.name)
        self.livro.pdf.storage.save(self.livro.pdf.name, SimpleUploadedFile('alterado.pdf', b'%PDF-conteudo-alterado'))
        self.assertFalse(arquivo_liberado(self.livro.pdf))

    def test_scanner_ausente_erro_timeout_e_resultado_sem_versao_falham_fechados(self):
        self.assertEqual(verificar_arquivo(self.livro.pdf).estado, 'erro')
        for resultado in [ResultadoVarredura('limpo'), ResultadoVarredura('desconhecido')]:
            self.scanner.verificar.return_value = resultado
            self.assertEqual(verificar_arquivo(self.livro.pdf, scanner=self.scanner).estado, 'erro')
            self.assertFalse(arquivo_liberado(self.livro.pdf))
        self.scanner.verificar.side_effect = TimeoutError()
        self.assertEqual(verificar_arquivo(self.livro.pdf, scanner=self.scanner).estado, 'erro')

    def test_rejeitado_nao_e_liberado_para_administrador(self):
        self.scanner.verificar.return_value = ResultadoVarredura('rejeitado', 'motor-sintetico')
        self.assertEqual(verificar_arquivo(self.livro.pdf, scanner=self.scanner).estado, 'rejeitado')
        self.assertFalse(verificar_acesso_obra(self.admin, self.livro).pode_ler)

    def test_scan_respeita_tamanho_maximo_sem_chamar_motor(self):
        with override_settings(MAX_BOOK_UPLOAD_SIZE=4):
            with self.assertRaises(ValueError): verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        self.scanner.verificar.assert_not_called()

    def test_amostra_limpa_nao_reabre_obra_retirada_ou_licenca_expirada(self):
        self.livro.pdf_amostra.save('amostra.pdf', pdf(), save=True)
        verificar_arquivo(self.livro.pdf_amostra, scanner=self.scanner)
        self.livro.status = 'publicado'
        self.assertTrue(verificar_acesso_obra(None, self.livro).pode_ler_amostra)
        self.livro.status = 'retirado'
        self.assertFalse(verificar_acesso_obra(None, self.livro).pode_ler_amostra)
        self.livro.status = 'publicado'
        self.livro.disponivel_ate = timezone.now() - timedelta(seconds=1)
        self.assertFalse(verificar_acesso_obra(None, self.livro).pode_ler_amostra)

    def test_rota_media_direta_nao_entrega_pdf_nem_pdf_com_extensao_imagem(self):
        from config.views import midia_publica
        from django.http import Http404
        from django.test import RequestFactory
        for caminho in [self.livro.pdf.name, 'livros/disfarce.jpg', 'outros/documento.pdf']:
            with self.assertRaises(Http404): midia_publica(RequestFactory().get('/media/'), caminho)

    def test_pdf_privado_autorizado_por_sessao_e_legacy_nao_emite_url_storage(self):
        verificar_arquivo(self.livro.pdf, scanner=self.scanner)
        fluxo.analisar_publicacao(self.admin, self.livro.solicitacao_publicacao.pk, 'aprovar')
        client = APIClient()
        client.force_login(self.leitor)
        resposta = client.get(f'/api/v1/biblioteca/livros/{self.livro.pk}/ler_pdf/')
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(b''.join(resposta.streaming_content).startswith(b'%PDF-'))

    def test_clamav_adapter_trata_codigos_timeout_e_versao(self):
        with override_settings(BOOK_CLAMSCAN_PATH=os.path.abspath('scanner-sintetico.exe')), \
                patch('biblioteca.quarentena.os.path.isfile', return_value=True), \
                patch('biblioteca.quarentena.subprocess.run') as run:
            for codigo, estado in [(0, 'limpo'), (1, 'rejeitado'), (2, 'erro')]:
                run.side_effect = [SimpleNamespace(stdout='ClamAV sintético/901'), SimpleNamespace(returncode=codigo)]
                self.assertEqual(ClamAVScanner().verificar(b'arquivo-sintetico').estado, estado)
            run.side_effect = subprocess.TimeoutExpired('scanner', 30)
            self.assertEqual(ClamAVScanner().verificar(b'arquivo-sintetico').estado, 'erro')
