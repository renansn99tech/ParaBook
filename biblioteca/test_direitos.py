import base64
from copy import deepcopy
from datetime import timedelta
from io import StringIO
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from django.contrib.auth.models import Permission
from django.core.management import call_command
from django.db import connection
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIClient

from biblioteca import direitos, publicacao
from biblioteca.cofre_direitos import CofreDireitos
from biblioteca.models import Categoria, LicencaObra, Livro, TentativaPublicacao
from biblioteca.recibos_direitos import canonicalizar, verificar_recibo
from biblioteca.services import verificar_acesso_obra
from biblioteca.test_publicacao import pdf, usuario
from usuarios.models import AuditoriaAcao


@override_settings(BOOK_RIGHTS_REQUIRED=True, BOOK_FILE_SCAN_REQUIRED=False)
class DireitosTests(TestCase):
    def setUp(self):
        self.autor = usuario('direitos-autor', 'autor')
        self.admin = usuario('direitos-admin', 'admin', True)
        self.admin.set_password('Senha-sintetica-G4')
        self.admin.save()
        self.admin.user_permissions.add(Permission.objects.get(codename='conferir_direitos'))
        self.moderador = usuario('direitos-moderador', 'moderador', True)
        self.leitor = usuario('direitos-leitor', 'leitor')
        self.categoria = Categoria.objects.create(nome='Direitos sintéticos')
        self.livro = publicacao.enviar_obra(self.autor, {
            'titulo': 'Conferência sintética', 'categoria': self.categoria, 'pdf': pdf(),
            'cpf_autor': '12345678901', 'declaracao_autoria': True, 'aceitou_termos': True,
        })
        self.privada = Ed25519PrivateKey.generate()
        self.chaves = override_settings(BOOK_VAULT_PUBLIC_KEYS={
            'teste-g4': base64.b64encode(self.privada.public_key().public_bytes_raw()).decode(),
        })
        self.chaves.enable()
        self.addCleanup(self.chaves.disable)
        self.client = APIClient()

    def recibo(self, livro=None, tentativa=None, **mudancas):
        livro = livro or self.livro
        agora = timezone.now()
        dados = {
            'schema': 'parabook-direitos-v1', 'chave_id': 'teste-g4', 'referencia': str(uuid4()),
            'livro_id': livro.pk, 'edicao_sha256': direitos.digest_edicao(livro, tentativa),
            'pdf_sha256': direitos.digest_arquivo(tentativa.pdf if tentativa else livro.pdf),
            'amostra_sha256': direitos.digest_arquivo(tentativa.pdf_amostra if tentativa else livro.pdf_amostra),
            'origem': tentativa.dados.get('origem', livro.origem) if tentativa else livro.origem,
            'versao': 'sintetico-v1', 'territorios': ['BR'], 'modelos_acesso': ['gratuito', 'amostra'],
            'vigente_de': (agora - timedelta(days=1)).isoformat(),
            'vigente_ate': (agora + timedelta(days=30)).isoformat(), 'emitido_em': agora.isoformat(),
        }
        dados.update(mudancas)
        return {'dados': dados, 'assinatura': base64.b64encode(self.privada.sign(canonicalizar(dados))).decode()}

    def conferir(self, **mudancas):
        return direitos.conferir_direitos(self.admin, self.livro.pk, self.recibo(**mudancas))

    def publicar(self):
        self.conferir()
        publicacao.analisar_publicacao(self.moderador, self.livro.solicitacao_publicacao.pk, 'aprovar')
        self.livro.refresh_from_db()

    def test_declaracao_nao_libera_direitos_nem_aprovacao(self):
        self.assertTrue(self.livro.solicitacao_publicacao.declaracao.pk)
        self.assertEqual(direitos.estado_direitos(self.livro), 'pendente')
        with self.assertRaises(PermissionDenied):
            publicacao.analisar_publicacao(self.admin, self.livro.solicitacao_publicacao.pk, 'aprovar')

    def test_conferencia_e_editorial_separados_por_edicao(self):
        self.conferir()
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.status, 'pendente')
        publicacao.analisar_publicacao(self.moderador, self.livro.solicitacao_publicacao.pk, 'aprovar')
        self.livro.refresh_from_db()
        self.assertTrue(verificar_acesso_obra(self.leitor, self.livro).pode_ler)

    def test_licenca_por_origem_sem_presumir_dominio_publico(self):
        for origem in ('dominio_publico', 'licenciado', 'autor_independente'):
            self.livro.origem = origem
            self.livro.save(update_fields=['origem'])
            self.assertEqual(direitos.estado_direitos(self.livro), 'pendente')
            self.conferir()
            self.assertEqual(direitos.estado_direitos(self.livro), 'conferida')

    def test_papeis_comuns_e_moderador_nao_conferem(self):
        recibo = self.recibo()
        for ator in (self.autor, self.leitor, self.moderador):
            with self.assertRaises(PermissionDenied):
                direitos.conferir_direitos(ator, self.livro.pk, recibo)
        self.assertFalse(LicencaObra.objects.exists())

    def test_recibo_alterado_assinatura_falsa_ou_outro_custodiante(self):
        original = self.recibo()
        for campo, valor in [('pdf_sha256', 'a' * 64), ('livro_id', self.livro.pk + 1), ('chave_id', 'desconhecido')]:
            recibo = deepcopy(original)
            recibo['dados'][campo] = valor
            with self.assertRaises(ValidationError):
                direitos.conferir_direitos(self.admin, self.livro.pk, recibo)
        self.assertFalse(LicencaObra.objects.exists())

    def test_recibo_assinado_incompativel_e_rejeitado(self):
        for mudancas in ({'livro_id': self.livro.pk + 1}, {'pdf_sha256': 'a' * 64},
                         {'edicao_sha256': 'b' * 64}, {'origem': 'licenciado'},
                         {'modelos_acesso': ['assinante']}, {'territorios': ['Brasil']},
                         {'emitido_em': (timezone.now() - timedelta(days=2)).isoformat()},
                         {'vigente_de': '2026-01-01T00:00:00'}, {'documento': 'proibido'}):
            with self.assertRaises(ValidationError):
                direitos.conferir_direitos(self.admin, self.livro.pk, self.recibo(**mudancas))

    def test_expiracao_territorio_e_modalidade_nao_tem_bypass_admin(self):
        licenca = self.conferir(territorios=['PT'])
        self.livro.status = 'publicado'
        self.livro.save()
        for ator in (self.admin, self.moderador, self.leitor, None):
            decisao = verificar_acesso_obra(ator, self.livro)
            self.assertFalse(decisao.pode_ler)
            self.assertFalse(decisao.pode_ler_amostra)
        licenca.territorios = ['BR']
        licenca.vigente_ate = timezone.now() - timedelta(seconds=1)
        licenca.save()
        self.assertEqual(direitos.estado_direitos(self.livro), 'expirada')
        self.assertFalse(verificar_acesso_obra(self.admin, self.livro).pode_ler)

    def test_revogar_bloqueia_e_nao_apaga_arquivo_ou_prova(self):
        self.publicar()
        licenca = self.livro.licencas.get()
        direitos.restringir_direitos(self.admin, self.livro.pk, licenca.protocolo, 'revogada')
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.status, 'manutencao')
        self.assertTrue(self.livro.pdf.storage.exists(self.livro.pdf.name))
        self.assertFalse(verificar_acesso_obra(self.admin, self.livro).pode_ler)
        with self.assertRaises(publicacao.ConflitoPublicacao):
            publicacao.restaurar_obra(self.admin, self.livro.pk, 'Tentativa de restauração')

    def test_recibo_idempotente_nao_reativa_revogacao(self):
        recibo = self.recibo()
        primeira = direitos.conferir_direitos(self.admin, self.livro.pk, recibo)
        eventos = self.livro.historico_publicacao.count()
        segunda = direitos.conferir_direitos(self.admin, self.livro.pk, recibo)
        self.assertEqual(primeira.pk, segunda.pk)
        self.assertEqual(eventos, self.livro.historico_publicacao.count())
        direitos.restringir_direitos(self.admin, self.livro.pk, primeira.protocolo, 'revogada')
        self.assertEqual(direitos.conferir_direitos(self.admin, self.livro.pk, recibo).estado, 'revogada')

    def test_auditoria_obrigatoria_reverte_conferencia_e_revogacao(self):
        with patch('biblioteca.publicacao.AuditoriaAcao.objects.create', side_effect=RuntimeError('sintético')):
            with self.assertRaises(RuntimeError):
                self.conferir()
        self.assertFalse(LicencaObra.objects.exists())
        self.publicar()
        licenca = self.livro.licencas.get()
        with patch('biblioteca.publicacao.AuditoriaAcao.objects.create', side_effect=RuntimeError('sintético')):
            with self.assertRaises(RuntimeError):
                direitos.restringir_direitos(self.admin, self.livro.pk, licenca.protocolo, 'disputa')
        licenca.refresh_from_db()
        self.livro.refresh_from_db()
        self.assertEqual(licenca.estado, 'conferida')
        self.assertEqual(self.livro.status, 'publicado')

    def test_troca_dos_bytes_na_mesma_chave_bloqueia_entrega(self):
        self.publicar()
        with self.livro.pdf.storage.open(self.livro.pdf.name, 'wb') as stream:
            stream.write(b'%PDF-bytes-alterados')
        with self.assertRaises(PermissionDenied):
            direitos.abrir_arquivo_licenciado(self.livro)

    def test_revisao_nao_substitui_licenca_e_edicao_publicadas(self):
        self.publicar()
        nome_anterior = self.livro.pdf.name
        tentativa = publicacao.enviar_revisao(self.autor, self.livro.pk, {'pdf': pdf('nova-edicao.pdf')})
        recibo = self.recibo(tentativa=tentativa)
        direitos.conferir_direitos(self.admin, self.livro.pk, recibo, tentativa_id=tentativa.pk)
        self.assertEqual(direitos.estado_direitos(self.livro), 'conferida')
        self.assertTrue(verificar_acesso_obra(self.leitor, self.livro).pode_ler)
        publicacao.analisar_publicacao(self.moderador, self.livro.solicitacao_publicacao.pk, 'aprovar', tentativa_id=tentativa.pk)
        self.livro.refresh_from_db()
        self.assertNotEqual(self.livro.pdf.name, nome_anterior)
        self.assertEqual(direitos.estado_direitos(self.livro, conferir_conteudo=True), 'conferida')
        self.assertTrue(self.livro.pdf.storage.exists(nome_anterior))

    def test_remocao_conselho_e_retirada_nao_sao_revertidas_por_licenca(self):
        self.publicar()
        self.livro.removido_definitivamente_em = timezone.now()
        self.livro.save()
        with self.assertRaises(publicacao.ConflitoPublicacao):
            self.conferir()
        self.assertFalse(verificar_acesso_obra(self.admin, self.livro).pode_ler)

    def test_preview_expiracao_aplicacao_idempotente_e_preservacao(self):
        self.publicar()
        self.livro.licencas.update(vigente_ate=timezone.now() - timedelta(seconds=1))
        call_command('expirar_direitos', stdout=StringIO())
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.status, 'publicado')
        call_command('expirar_direitos', aplicar=True, stdout=StringIO())
        call_command('expirar_direitos', aplicar=True, stdout=StringIO())
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.status, 'expirado')
        self.assertEqual(self.livro.historico_publicacao.filter(acao='direitos_expirados').count(), 1)
        self.assertTrue(self.livro.pdf.storage.exists(self.livro.pdf.name))

    def test_chave_de_custodia_removida_ou_trocada_nao_mantem_liberdade(self):
        self.publicar()
        with override_settings(BOOK_VAULT_PUBLIC_KEYS={}):
            self.assertEqual(direitos.estado_direitos(self.livro), 'custodia_indisponivel')
            self.assertFalse(verificar_acesso_obra(self.admin, self.livro).pode_ler)
        outra = Ed25519PrivateKey.generate()
        with override_settings(BOOK_VAULT_PUBLIC_KEYS={'teste-g4': base64.b64encode(outra.public_key().public_bytes_raw()).decode()}):
            self.assertEqual(direitos.estado_direitos(self.livro), 'custodia_indisponivel')

    def test_recurso_de_direitos_nao_reativa_licenca(self):
        self.publicar()
        licenca = self.livro.licencas.get()
        direitos.restringir_direitos(self.admin, self.livro.pk, licenca.protocolo, 'revogada')
        evento = self.livro.historico_publicacao.filter(acao='direitos_revogada').get()
        recurso = publicacao.recorrer(self.autor, evento.pk, 'Solicito nova conferência da autorização sintética.')
        publicacao.analisar_recurso(self.moderador, recurso.pk, True, 'Orientado apresentar nova conferência de direitos.')
        self.livro.refresh_from_db()
        licenca.refresh_from_db()
        self.assertEqual(licenca.estado, 'revogada')
        self.assertEqual(self.livro.status, 'manutencao')

    def test_api_reautenticacao_e_recebimento_minimo(self):
        self.client.force_authenticate(self.admin)
        url = f'/api/v1/dashboard/direitos/{self.livro.pk}/'
        entrada = {'acao': 'conferir', 'recibo': self.recibo(), 'senha_atual': 'errada'}
        self.assertEqual(self.client.post(url, entrada, format='json').status_code, 403)
        entrada['senha_atual'] = 'Senha-sintetica-G4'
        self.assertEqual(self.client.post(url, entrada, format='json').status_code, 200)
        self.client.force_authenticate(self.moderador)
        resposta = self.client.get(url)
        self.assertIsNone(resposta.data['contexto_custodia'])
        self.assertEqual(resposta.data['licencas'], [])
        self.assertEqual(self.client.post(url, entrada, format='json').status_code, 403)
        self.client.force_authenticate(self.leitor)
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_arquivo_ausente_e_remocao_definitiva_nao_expoem_contexto(self):
        self.client.force_authenticate(self.admin)
        self.livro.pdf.storage.delete(self.livro.pdf.name)
        url = f'/api/v1/dashboard/direitos/{self.livro.pk}/'
        resposta = self.client.get(url)
        self.assertEqual(resposta.status_code, 200)
        self.assertFalse(resposta.data['conferencia_permitida'])
        self.assertIsNone(resposta.data['contexto_custodia'])
        self.livro.removido_definitivamente_em = timezone.now()
        self.livro.save()
        self.assertFalse(self.client.get(url).data['conferencia_permitida'])

    def test_api_publica_e_auditoria_nao_expoem_prova_ou_referencia(self):
        self.publicar()
        self.client.force_authenticate(self.leitor)
        resposta = self.client.get(f'/api/v1/biblioteca/livros/{self.livro.pk}/')
        corpo = json.dumps(resposta.data)
        for campo in ('referencia_cofre', 'recibo_sha256', 'pdf_sha256', 'assinatura', 'cpf'):
            self.assertNotIn(f'"{campo}"', corpo)
        self.assertEqual(resposta.data['direitos_estado'], 'conferida')
        metadados = list(AuditoriaAcao.objects.filter(acao='publicacao.direitos_conferidos').values_list('metadados', flat=True))
        self.assertNotIn('referencia', json.dumps(metadados))

    def test_cadastro_administrativo_gated_nao_publica_e_entra_na_fila(self):
        self.client.force_authenticate(self.admin)
        resposta = self.client.post('/api/v1/biblioteca/livros/', {
            'titulo': 'Acervo sintético', 'autor': 'Autor sintético', 'origem': 'dominio_publico',
            'categoria': self.categoria.pk, 'pdf': pdf(),
        }, format='multipart')
        self.assertEqual(resposta.status_code, 201)
        livro = Livro.objects.get(pk=resposta.data['id'])
        self.assertEqual(livro.status, 'pendente')
        self.assertEqual(livro.solicitacao_publicacao.tentativas.get().status, 'pendente')

    def test_edicao_administrativa_preserva_versao_vigente(self):
        self.livro.origem = 'licenciado'
        self.livro.save()
        tentativa_inicial = self.livro.solicitacao_publicacao.tentativas.get()
        tentativa_inicial.dados = publicacao._snapshot(self.livro)
        tentativa_inicial.save(update_fields=['dados'])
        self.publicar()
        self.client.force_authenticate(self.admin)
        resposta = self.client.patch(f'/api/v1/biblioteca/livros/{self.livro.pk}/', {'titulo': 'Nova versão'}, format='json')
        self.assertEqual(resposta.status_code, 200)
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.titulo, 'Conferência sintética')
        self.assertEqual(self.livro.solicitacao_publicacao.tentativas.first().dados['titulo'], 'Nova versão')
        self.assertEqual(direitos.estado_direitos(self.livro), 'conferida')

    def test_rls_habilitado_nas_tabelas_do_g4(self):
        with connection.cursor() as cursor:
            cursor.execute("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('biblioteca_licencaobra', 'biblioteca_verificacoes_arquivos')")
            self.assertEqual(dict(cursor.fetchall()), {'biblioteca_licencaobra': True, 'biblioteca_verificacoes_arquivos': True})


class CofreTests(SimpleTestCase):
    def test_custodia_cifrada_recibo_minimo_e_credenciais_separadas(self):
        with tempfile.TemporaryDirectory(prefix='parabook-cofre-test-') as pasta:
            cofre = CofreDireitos(pasta)
            publicas = cofre.inicializar('ensaio')
            documento = b'documento juridico exclusivamente sintetico'
            condicoes = {campo: 'Conferido em ensaio sintético' for campo in (
                'titularidade', 'fonte', 'retirada', 'exclusividade', 'sublicenca', 'responsavel')}
            recibo = cofre.custodiar(documento, {'livro_id': 123}, condicoes)
            self.assertEqual(verificar_recibo(recibo, publicas['ensaio'])['livro_id'], 123)
            cifrado = (Path(pasta) / f'{recibo["dados"]["referencia"]}.prova').read_bytes()
            self.assertNotIn(documento, cifrado)
            self.assertNotIn('condicoes', json.dumps(recibo))
            with self.assertRaises(InvalidToken):
                Fernet(Fernet.generate_key()).decrypt(cifrado)
            self.assertEqual(base64.b64decode(cofre.consultar(recibo['dados']['referencia'])['documento']), documento)
            with self.assertRaises(FileExistsError):
                cofre.inicializar('outra')

    def test_documento_e_condicoes_obrigatorios_sem_caminho_arbitrario(self):
        with tempfile.TemporaryDirectory() as pasta:
            cofre = CofreDireitos(pasta)
            cofre.inicializar('ensaio')
            with self.assertRaises(ValueError):
                cofre.custodiar(b'', {}, {})
            with self.assertRaises(ValueError):
                cofre.custodiar(b'prova', {}, {})
            with self.assertRaises(ValueError):
                cofre.consultar('../../credencial')

    def test_cofre_rejeita_localizacao_no_repositorio(self):
        with self.assertRaises(ValueError):
            CofreDireitos(Path(__file__).resolve().parents[1] / 'media' / 'cofre')
