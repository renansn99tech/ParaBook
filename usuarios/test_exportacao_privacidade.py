import json
import logging
from datetime import timedelta
from io import StringIO
from uuid import uuid4

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIClient

from biblioteca.models import Categoria, EventoLeitura, Livro
from comunidades.models import Comunidade, PostagemComunidade, RespostaPostagem
from config.logging import JsonFormatter
from gamificacao.models import ProgressoLeitor
from perfis.models import Perfil
from usuarios.audit import registrar_acao
from usuarios.idade import registrar_declaracao
from usuarios.models import AuditoriaAcao, EventoGovernancaConta, SessaoDispositivo, SolicitacaoSuporte, Usuario
from usuarios.privacidade_provas import ler_prova


class ExportacaoPrivacidadeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='dono-exportacao', email='titular@example.test', password='x')
        Usuario.objects.create(user_auth=self.user, nome='Titular')
        self.outro = User.objects.create_user(username='nao-exportar', email='terceiro@example.test', password='x')
        self.perfil = Perfil.objects.create(usuario=self.user, bio='Bio própria')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_cobertura_13_categorias_isola_dois_titulares_e_nao_entrega_seguro_ou_midia_alheia(self):
        comunidade = Comunidade.objects.create(nome='Contexto', descricao='Comunidade')
        post = PostagemComunidade.objects.create(autor=self.user, comunidade=comunidade, titulo='Meu texto', conteudo='Conteúdo próprio')
        RespostaPostagem.objects.create(autor=self.outro, postagem=post, conteudo='Não exportar resposta de terceiro')
        SolicitacaoSuporte.objects.create(usuario=self.user, assunto='Meu caso', mensagem='Mensagem própria')
        SolicitacaoSuporte.objects.create(usuario=self.outro, assunto='Outro caso', mensagem='Não exportar outro caso')
        ProgressoLeitor.objects.update_or_create(user=self.user, defaults={'pontos_xp': 123})
        livro = Livro.objects.create(titulo='Referência', autor='Autora', categoria=Categoria.objects.create(nome='Gênero'))
        EventoLeitura.objects.create(usuario=self.user, livro=livro, pagina=7)
        EventoLeitura.objects.create(usuario=self.outro, livro=livro, pagina=99)
        SessaoDispositivo.objects.create(usuario=self.user, refresh_jti='segredo-jti', ip_hash='segredo-hash-ip',
            user_agent='segredo-user-agent', expira_em=timezone.now() + timedelta(days=1))
        self.perfil.foto.save('privada.png', ContentFile(b'arquivo-sintetico'))
        resposta = self.client.get('/api/v1/auth/exportar-dados/')
        dados = json.loads(resposta.content)
        conteudo = resposta.content.decode()
        self.assertEqual(len(dados['cobertura']), 13)
        self.assertEqual(dados['categorias']['T06']['progresso'][0]['pontos_xp'], 123)
        self.assertEqual(dados['categorias']['T05']['eventos'][0]['pagina'], 7)
        for proibido in ('segredo-jti', 'segredo-hash-ip', 'segredo-user-agent', 'terceiro@example.test',
                         'Não exportar resposta de terceiro', 'Não exportar outro caso', self.perfil.foto.name):
            self.assertNotIn(proibido, conteudo)
        self.assertEqual(dados['arquivos_proprios'][0]['acesso'], 'atendimento_assistido_com_permissao_conferida')
        self.assertFalse(dados['entrega']['arquivo_temporario_servidor'])
        self.assertIn('no-store', resposta['Cache-Control'])

    def test_visitante_nao_exporta_e_id_digitado_nao_muda_titular(self):
        visitante = APIClient()
        self.assertEqual(visitante.get('/api/v1/auth/exportar-dados/').status_code, 401)
        resposta = self.client.get(f'/api/v1/auth/exportar-dados/?usuario={self.outro.pk}')
        self.assertEqual(json.loads(resposta.content)['categorias']['T01']['id'], self.user.pk)

    def test_correcao_etaria_preserva_duas_declaracoes_cifradas_e_exporta_apenas_ao_titular(self):
        for ano in (2000, 1999):
            registrar_declaracao(usuario_auth=self.user, data_nascimento=timezone.localdate().replace(year=ano),
                chave_idempotencia=uuid4(), origem='web')
        provas = self.user.provas_privacidade.order_by('pk')
        self.assertEqual(provas.count(), 2)
        for prova in provas:
            self.assertNotIn('data_declarada', prova.conteudo_cifrado)
            with self.assertRaises(PermissionDenied):
                ler_prova(prova=prova, ator=self.outro)
        dados = json.loads(self.client.get('/api/v1/auth/exportar-dados/').content)
        datas = [d['data_declarada'] for d in dados['categorias']['T03']['declaracoes_segregadas']]
        self.assertEqual({d[:4] for d in datas}, {'1999', '2000'})

    def test_privacidade_padrao_nova_conta_e_preferencia_antiga_sao_independentes(self):
        self.assertFalse(self.perfil.exibir_email)
        self.assertFalse(self.perfil.exibir_idade)
        self.assertFalse(self.perfil.exibir_data_nascimento)
        self.perfil.exibir_email = True
        self.perfil.save(update_fields=['exibir_email'])
        nova = Perfil.objects.create(usuario=self.outro)
        self.perfil.refresh_from_db()
        self.assertTrue(self.perfil.exibir_email)
        self.assertFalse(nova.exibir_email)

    def test_localizacao_admite_regiao_e_rejeita_endereco_sem_repetir_payload(self):
        from perfis.api.serializers import PerfilSerializer
        from rest_framework.exceptions import ValidationError
        serializer = PerfilSerializer()
        self.assertEqual(serializer.validate_localizacao('Belém, Pará'), 'Belém, Pará')
        for valor in ('Rua Pessoal, 42', '-1.45, -48.50', 'CEP 66000000'):
            with self.subTest(valor=valor):
                with self.assertRaises(ValidationError) as erro:
                    serializer.validate_localizacao(valor)
                self.assertNotIn(valor, str(erro.exception))


class EventosMinimosTests(TestCase):
    def test_config_gunicorn_nao_reproduz_url_token_ou_excecao(self):
        from pathlib import Path
        from logging.config import dictConfig
        from django.conf import settings
        from unittest.mock import patch
        stream = StringIO()
        config = json.loads((Path(settings.BASE_DIR) / 'config/gunicorn-logging.json').read_text())
        try:
            with patch('sys.stderr', stream):
                dictConfig(config)
                logging.getLogger('gunicorn.access').info('%(r)s %(s)s', {'r': '/?token=segredo', 's': '200', 'M': 12})
                try:
                    raise ValueError('senha e corpo restrito')
                except ValueError:
                    logging.getLogger('gunicorn.error').exception('Falha com dado pessoal')
            linhas = [json.loads(linha) for linha in stream.getvalue().splitlines()]
            self.assertEqual(linhas[0]['status_http'], 200)
            self.assertEqual(linhas[1]['erro_codigo'], 'ValueError')
            for proibido in ('segredo', 'senha', 'corpo restrito', 'dado pessoal'):
                self.assertNotIn(proibido, stream.getvalue())
        finally:
            dictConfig(settings.LOGGING)

    def test_campo_extra_segredo_e_tipos_incorretos_nao_persistem(self):
        evento = registrar_acao(ator=None, acao='sessao.encerrada', recurso='SessaoDispositivo', recurso_id='https://segredo.example',
            metadados={'quantidade': True, 'token': 'nao-persistir', 'payload': {'senha': 'nao-persistir'}})
        self.assertEqual(evento.metadados, {'versao_schema': 'g5-v1'})
        self.assertEqual(evento.recurso_id, '')
        evento = registrar_acao(ator=None, acao='sessao.encerrada', recurso='SessaoDispositivo', metadados={'quantidade': 3})
        self.assertEqual(evento.metadados, {'versao_schema': 'g5-v1', 'quantidade': 3})

    def test_governanca_preserva_vinculos_e_recusa_json_extra(self):
        user = User.objects.create_user(username='evento-seguro')
        original = str(uuid4())
        evento = EventoGovernancaConta.objects.create(usuario=user, tipo='suspensao_revogada', motivo='Registro restrito',
            metadados={'suspensao_id': 2, 'protocolo_original': original, 'extra': {'senha': 'segredo'}})
        self.assertEqual(evento.metadados, {'versao_schema': 'g5-v1', 'suspensao_id': 2, 'protocolo_original': original})

    def test_evento_desconhecido_nao_ecoa_payload_e_excecao_nao_entra_em_log_comum(self):
        logger = logging.getLogger('usuarios.audit')
        saida = StringIO()
        handler = logging.StreamHandler(saida)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        try:
            self.assertIsNone(registrar_acao(ator=None, acao='evento-segredo-nao-catalogado', recurso='User', metadados={'segredo': 'senha-nao-expor'}))
            try:
                raise ValueError('token-super-secreto https://bucket.example/chave?assinatura=segredo')
            except ValueError:
                logger.exception('Payload completo: senha-nao-expor')
        finally:
            logger.removeHandler(handler)
        self.assertNotIn('senha-nao-expor', saida.getvalue())
        self.assertNotIn('token-super-secreto', saida.getvalue())
        self.assertNotIn('bucket.example', saida.getvalue())
        self.assertIn('ValueError', saida.getvalue())
