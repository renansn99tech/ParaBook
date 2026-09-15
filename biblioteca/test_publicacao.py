import io
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier, Event
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import close_old_connections, connections
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from pypdf import PdfWriter
from rest_framework.test import APIClient
from rest_framework.exceptions import PermissionDenied

from biblioteca import publicacao as fluxo
from biblioteca.models import (
    Biblioteca, BloqueioPublicacao, Categoria, Denuncia, EventoPublicacao, Livro,
    RecursoPublicacao, SolicitacaoPublicacao, TentativaPublicacao,
)
from notificacoes.models import Notificacao
from usuarios.models import Usuario


def pdf(nome='teste.pdf'):
    destino = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.write(destino)
    return SimpleUploadedFile(nome, destino.getvalue(), content_type='application/pdf')


def usuario(nome, tipo, staff=False):
    user = User.objects.create_user(username=nome, is_staff=staff)
    Usuario.objects.create(user_auth=user, nome=nome, tipo=tipo)
    return user


class PublicacaoTests(TestCase):
    def setUp(self):
        cache.clear()
        self.media = tempfile.TemporaryDirectory(prefix='parabook-publicacao-')
        self.addCleanup(self.media.cleanup)
        self.config = override_settings(MEDIA_ROOT=self.media.name)
        self.config.enable()
        self.addCleanup(self.config.disable)
        self.autor = usuario('autor-fluxo', 'autor')
        self.outro = usuario('outro-fluxo', 'autor')
        self.admin = usuario('admin-fluxo', 'admin', True)
        self.leitor = usuario('leitor-fluxo', 'leitor')
        self.categoria = Categoria.objects.create(nome='Publicação')
        self.client = APIClient()
        self.client.force_authenticate(self.autor)

    def dados(self):
        return {'titulo': 'Original', 'categoria': self.categoria, 'pdf': pdf(),
                'cpf_autor': '12345678901', 'declaracao_autoria': True, 'aceitou_termos': True}

    def obra(self, publicada=True):
        livro = fluxo.enviar_obra(self.autor, self.dados())
        if publicada:
            fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'aprovar')
            livro.refresh_from_db()
        return livro

    def test_publicacao_cria_versao_auditoria_e_notificacao(self):
        livro = self.obra(False)
        self.assertEqual(livro.status, 'pendente')
        self.assertEqual(TentativaPublicacao.objects.count(), 1)
        self.assertEqual(livro.historico_publicacao.get().acao, 'enviada')
        self.assertTrue(Notificacao.objects.filter(usuario=self.autor).exists())

    def test_retirada_preserva_estante_avaliacoes_e_limita_novas_obras(self):
        livro = self.obra()
        Biblioteca.objects.create(user=self.leitor, livro=livro, nota=5, xp_ganho_adicao=True)
        fluxo.retirar_obra(self.autor, livro.pk)
        livro.refresh_from_db()
        self.assertEqual(livro.status, 'retirado')
        self.assertEqual(Biblioteca.objects.get().nota, 5)
        with self.assertRaises(fluxo.ConflitoPublicacao):
            fluxo.enviar_obra(self.autor, self.dados())
        bloqueio = BloqueioPublicacao.objects.get(usuario=self.autor)
        self.assertEqual(bloqueio.novas_obras_apos, livro.retirado_em + timedelta(hours=24))

    def test_repeticao_da_retirada_nao_prorroga_nem_notifica_novamente(self):
        livro = self.obra()
        fluxo.retirar_obra(self.autor, livro.pk)
        prazo = BloqueioPublicacao.objects.get().novas_obras_apos
        eventos = EventoPublicacao.objects.count()
        mensagens = Notificacao.objects.count()
        fluxo.retirar_obra(self.autor, livro.pk)
        self.assertEqual(BloqueioPublicacao.objects.get().novas_obras_apos, prazo)
        self.assertEqual(EventoPublicacao.objects.count(), eventos)
        self.assertEqual(Notificacao.objects.count(), mensagens)

    def test_limite_exato_de_24_horas(self):
        livro = self.obra()
        fluxo.retirar_obra(self.autor, livro.pk)
        limite = BloqueioPublicacao.objects.get().novas_obras_apos
        with patch('biblioteca.publicacao.timezone.now', return_value=limite - timedelta(microseconds=1)):
            with self.assertRaises(fluxo.ConflitoPublicacao):
                fluxo.enviar_obra(self.autor, self.dados())
        with patch('biblioteca.publicacao.timezone.now', return_value=limite):
            self.assertEqual(fluxo.enviar_obra(self.autor, self.dados()).status, 'pendente')

    def test_retirada_nao_afeta_envio_de_outro_autor(self):
        fluxo.retirar_obra(self.autor, self.obra().pk)
        self.assertEqual(fluxo.enviar_obra(self.outro, self.dados()).status, 'pendente')

    def test_apenas_proprietario_pode_retirar_editar_ou_consultar_historico(self):
        livro = self.obra()
        self.client.force_authenticate(self.outro)
        for acao in ['retirar', 'revisar', 'reenviar']:
            response = self.client.post(f'/api/v1/biblioteca/minhas-publicacoes/{livro.pk}/{acao}/', {'titulo': 'Fraude'})
            self.assertEqual(response.status_code, 404)
        self.assertEqual(self.client.get(f'/api/v1/biblioteca/minhas-publicacoes/{livro.pk}/historico/').status_code, 404)

    def test_edicao_nao_substitui_versao_ate_aprovacao(self):
        livro = self.obra()
        arquivo_original = livro.pdf.name
        fluxo.enviar_revisao(self.autor, livro.pk, {'titulo': 'Revisada', 'pdf': pdf('nova.pdf')})
        livro.refresh_from_db()
        self.assertEqual(livro.titulo, 'Original')
        self.assertEqual(livro.pdf.name, arquivo_original)
        self.assertEqual(livro.status, 'publicado')
        fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'aprovar')
        livro.refresh_from_db()
        self.assertEqual(livro.titulo, 'Revisada')
        self.assertNotEqual(livro.pdf.name, arquivo_original)
        self.assertEqual(livro.solicitacao_publicacao.tentativas.count(), 2)

    def test_rejeicao_da_edicao_preserva_versao_publicada(self):
        livro = self.obra()
        fluxo.enviar_revisao(self.autor, livro.pk, {'titulo': 'Revisada'})
        fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'recusar', 'Correção necessária')
        livro.refresh_from_db()
        self.assertEqual(livro.status, 'publicado')
        self.assertEqual(livro.titulo, 'Original')

    def test_edicao_durante_bloqueio_nao_republica_retirada(self):
        livro = self.obra()
        fluxo.retirar_obra(self.autor, livro.pk)
        fluxo.enviar_revisao(self.autor, livro.pk, {'titulo': 'Retirada revisada'})
        fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'aprovar')
        livro.refresh_from_db()
        self.assertEqual(livro.status, 'retirado')
        self.assertEqual(livro.titulo, 'Retirada revisada')

    def test_reenvio_cria_tentativa_sem_criar_outra_obra(self):
        livro = self.obra(False)
        fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'recusar', 'Corrigir edição')
        fluxo.enviar_revisao(self.autor, livro.pk, {'edicao': 'Revisada'}, reenviar=True)
        self.assertEqual(Livro.objects.count(), 1)
        self.assertEqual(TentativaPublicacao.objects.count(), 2)
        self.assertEqual(TentativaPublicacao.objects.filter(status='rejeitado').count(), 1)

    def test_repeticao_de_decisao_retorna_conflito(self):
        livro = self.obra()
        with self.assertRaises(fluxo.ConflitoPublicacao):
            fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'aprovar')

    def test_admin_nao_aprova_versao_diferente_da_que_conferiu(self):
        livro = self.obra(False)
        antiga = livro.solicitacao_publicacao.tentativas.get().pk
        fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'recusar', 'Corrigir')
        fluxo.enviar_revisao(self.autor, livro.pk, {'titulo': 'Versão nova'}, reenviar=True)
        with self.assertRaises(fluxo.ConflitoPublicacao):
            fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'aprovar', tentativa_id=antiga)
        self.assertTrue(TentativaPublicacao.objects.filter(status='pendente').exists())

    def test_recurso_de_rejeicao_nao_afeta_versao_posterior(self):
        livro = self.obra(False)
        fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'recusar', 'Corrigir')
        recurso = fluxo.recorrer(self.autor, EventoPublicacao.objects.get(acao='rejeitada').pk, 'Revisar decisão')
        fluxo.enviar_revisao(self.autor, livro.pk, {'titulo': 'Nova'}, reenviar=True)
        with self.assertRaises(fluxo.ConflitoPublicacao):
            fluxo.analisar_recurso(self.admin, recurso.pk, True, 'Rever decisão antiga')
        self.assertEqual(TentativaPublicacao.objects.filter(status='pendente').count(), 1)

    def test_recurso_de_edicao_recusada_reabre_analise_sem_apagar_publicacao(self):
        livro = self.obra()
        fluxo.enviar_revisao(self.autor, livro.pk, {'titulo': 'Revisada'})
        fluxo.analisar_publicacao(self.admin, livro.solicitacao_publicacao.pk, 'recusar', 'Corrigir')
        recurso = fluxo.recorrer(self.autor, EventoPublicacao.objects.get(acao='rejeitada').pk, 'Revisar decisão')
        fluxo.analisar_recurso(self.admin, recurso.pk, True, 'Nova análise necessária')
        livro.refresh_from_db()
        self.assertEqual(livro.status, 'publicado')
        self.assertEqual(livro.titulo, 'Original')
        self.assertEqual(TentativaPublicacao.objects.filter(status='pendente').count(), 1)

    def test_auditoria_ou_notificacao_falha_reverte_retirada(self):
        livro = self.obra()
        for alvo in ['biblioteca.publicacao.AuditoriaAcao.objects.create', 'biblioteca.publicacao.Notificacao.objects.create']:
            with patch(alvo, side_effect=RuntimeError('Falha simulada')):
                with self.assertRaises(RuntimeError):
                    fluxo.retirar_obra(self.autor, livro.pk)
            livro.refresh_from_db()
            self.assertEqual(livro.status, 'publicado')
            self.assertFalse(BloqueioPublicacao.objects.exists())

    def test_admin_e_leitor_nao_enviam_como_autor(self):
        for user in [self.admin, self.leitor, User.objects.create_superuser('super-fluxo')]:
            self.client.force_authenticate(user)
            self.assertEqual(self.client.post('/api/v1/biblioteca/solicitacoes-publicacao/', {}).status_code, 403)

    def test_dashboard_so_cadastra_acervo_da_plataforma(self):
        self.client.force_authenticate(self.admin)
        base = {'titulo': 'Acervo', 'autor': 'Clássico', 'categoria': self.categoria.pk}
        resposta = self.client.post('/api/v1/biblioteca/livros/', {**base, 'origem': 'autor_independente'}, format='json')
        self.assertEqual(resposta.status_code, 400)
        resposta = self.client.post('/api/v1/biblioteca/livros/', {**base, 'origem': 'dominio_publico', 'status': 'removido'}, format='json')
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data['status'], 'publicado')

    def test_admin_nao_edita_autoria_diretamente_nem_apaga_obra(self):
        livro = self.obra()
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(f'/api/v1/biblioteca/livros/{livro.pk}/', {'titulo': 'Fraude'}).status_code, 403)
        self.assertEqual(self.client.delete(f'/api/v1/biblioteca/livros/{livro.pk}/').status_code, 403)

    def test_staff_sem_papel_admin_nao_tem_curadoria(self):
        user = usuario('staff-leitor', 'leitor', True)
        livro = self.obra(False)
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get(f'/api/v1/biblioteca/livros/{livro.pk}/ler_pdf/').status_code, 404)
        self.assertEqual(self.client.post('/api/v1/biblioteca/livros/', {}).status_code, 403)

    def test_denuncia_exige_evidencia_e_nao_oculta_obra(self):
        livro = self.obra()
        self.client.force_authenticate(self.leitor)
        self.assertEqual(self.client.post('/api/v1/biblioteca/denuncias/', {'livro': livro.pk, 'motivo': 'Cópia'}).status_code, 400)
        r = self.client.post('/api/v1/biblioteca/denuncias/', {'livro': livro.pk, 'motivo': 'Cópia', 'evidencias': 'Página 3 e referência original.'})
        self.assertEqual(r.status_code, 201)
        self.assertIn('protocolo', r.data)
        livro.refresh_from_db()
        self.assertEqual(livro.status, 'publicado')

    def test_denuncia_externa_so_pode_ser_protocolada_por_admin(self):
        livro = self.obra()
        dados = {'livro': livro.pk, 'motivo': 'Cópia', 'evidencias': 'Referência', 'referencia_externa': 'Atendimento 001'}
        self.assertEqual(self.client.post('/api/v1/biblioteca/denuncias/', dados).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post('/api/v1/biblioteca/denuncias/', dados).status_code, 201)
        self.assertIsNone(Denuncia.objects.get().usuario_id)

    def test_suspensao_bloqueia_pdf_amostra_e_gera_recurso(self):
        livro = self.obra()
        livro.pdf_amostra = pdf('amostra.pdf')
        livro.save()
        d = fluxo.denunciar(self.leitor, livro.pk, 'Cópia', 'Referência original')
        fluxo.moderar_denuncia(self.admin, d.pk, 'suspender', 'Risco fundamentado')
        self.client.force_authenticate(self.autor)
        self.assertEqual(self.client.get(f'/api/v1/biblioteca/livros/{livro.pk}/ler_pdf/').status_code, 403)
        self.assertEqual(self.client.get(f'/api/v1/biblioteca/livros/{livro.pk}/ler_amostra/').status_code, 404)
        evento = EventoPublicacao.objects.get(acao='suspensa')
        recurso = fluxo.recorrer(self.autor, evento.pk, 'Tenho a autorização')
        with self.assertRaises(fluxo.ConflitoPublicacao):
            fluxo.recorrer(self.autor, evento.pk, 'Duplicado')
        fluxo.analisar_recurso(self.admin, recurso.pk, True, 'Autorização conferida')
        livro.refresh_from_db()
        self.assertEqual(livro.status, 'publicado')

    def test_recurso_nao_revoga_outra_denuncia(self):
        livro = self.obra()
        d1 = fluxo.denunciar(self.leitor, livro.pk, 'Cópia', 'Referência 1')
        d2 = fluxo.denunciar(self.leitor, livro.pk, 'Cópia', 'Referência 2')
        fluxo.moderar_denuncia(self.admin, d1.pk, 'aprovar', 'Decisão 1')
        fluxo.moderar_denuncia(self.admin, d2.pk, 'aprovar', 'Decisão 2')
        recurso = fluxo.recorrer(self.autor, EventoPublicacao.objects.get(denuncia=d1, acao='denuncia_acolhida').pk, 'Revisar 1')
        fluxo.analisar_recurso(self.admin, recurso.pk, True, 'Revertida 1')
        livro.refresh_from_db()
        self.assertEqual(livro.status, 'removido')
        d2.refresh_from_db()
        self.assertEqual(d2.status, 'removido')

    def test_restauracao_respeita_retirada_e_vigencia(self):
        livro = self.obra()
        livro.status = 'removido'
        livro.disponivel_ate = timezone.now() - timedelta(days=1)
        livro.save()
        with self.assertRaises(fluxo.ConflitoPublicacao):
            fluxo.restaurar_obra(self.admin, livro.pk, 'Restaurar')
        fluxo.retirar_obra(self.autor, livro.pk)
        with self.assertRaises(fluxo.ConflitoPublicacao):
            fluxo.restaurar_obra(self.admin, livro.pk, 'Restaurar')

    def test_reabertura_preserva_historico_e_nao_restaura(self):
        livro = self.obra()
        d = fluxo.denunciar(self.leitor, livro.pk, 'Cópia', 'Referência')
        fluxo.moderar_denuncia(self.admin, d.pk, 'aprovar', 'Confirmado')
        fluxo.moderar_denuncia(self.admin, d.pk, 'reabrir', 'Nova evidência recebida')
        d.refresh_from_db()
        livro.refresh_from_db()
        self.assertEqual(d.status, 'pendente')
        self.assertEqual(livro.status, 'removido')
        self.assertTrue(EventoPublicacao.objects.filter(denuncia=d, motivo='Confirmado').exists())

    def test_historico_paginado_nao_expoe_identidade_do_denunciante(self):
        livro = self.obra()
        fluxo.denunciar(self.leitor, livro.pk, 'Cópia', 'Evidência privada')
        r = self.client.get(f'/api/v1/biblioteca/minhas-publicacoes/{livro.pk}/historico/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('results', r.data)
        self.assertNotIn('leitor-fluxo', str(r.data))
        self.assertNotIn('Evidência privada', str(r.data))

    def test_previa_de_revisao_e_privada(self):
        livro = self.obra(False)
        url = f'/api/v1/dashboard/publicacoes/{livro.solicitacao_publicacao.pk}/revisao/'
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(self.admin)
        resposta = self.client.get(url)
        self.assertEqual(resposta.status_code, 200)
        self.assertNotIn('livros/', str(resposta.data))
        resposta = self.client.get(url, {'arquivo': 'pdf'})
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(b"%PDF-" in b"".join(resposta.streaming_content))

    def test_versoes_preservam_dados_sem_expor_caminho_de_arquivo(self):
        livro = self.obra()
        fluxo.enviar_revisao(self.autor, livro.pk, {'titulo': 'Revisada'})
        r = self.client.get(f'/api/v1/biblioteca/minhas-publicacoes/{livro.pk}/versoes/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual([v['dados']['titulo'] for v in r.data['results']], ['Revisada', 'Original'])
        self.assertNotIn('livros/', str(r.data))
        self.client.force_authenticate(self.outro)
        self.assertEqual(self.client.get(f'/api/v1/biblioteca/minhas-publicacoes/{livro.pk}/versoes/').status_code, 404)

    def test_revisao_via_api_rejeita_pdf_invalido_e_payload_de_autorizacao(self):
        livro = self.obra()
        url = f'/api/v1/biblioteca/minhas-publicacoes/{livro.pk}/revisar/'
        r = self.client.post(url, {'pdf': SimpleUploadedFile('invalido.pdf', b'executavel')}, format='multipart')
        self.assertEqual(r.status_code, 400)
        r = self.client.post(url, {'status': 'publicado', 'origem': 'dominio_publico', 'autor': 'Intruso'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(TentativaPublicacao.objects.count(), 1)

    def test_legado_nao_apaga_obra_nem_ignora_moderacao(self):
        self.admin.set_password('teste-local')
        self.admin.save()
        # O painel legado aceita apenas superusuário; mesmo esse papel não contorna o fluxo.
        self.admin.is_superuser = True
        self.admin.save()
        perfil = self.admin.perfil_customizado
        from django.conf import settings
        perfil.termos_aceitos = True
        perfil.versao_termos_aceita = settings.TERMS_VERSION
        perfil.save()
        self.client.force_login(self.admin)
        livro = self.obra()
        self.assertEqual(self.client.post('/dashboard/painel-admin/', {'btn_deletar_livro': '1', 'livro_id': livro.pk}).status_code, 409)
        self.assertEqual(self.client.post('/dashboard/lixeira/', {'acao': 'excluir_livro_permanente', 'item_id': livro.pk}).status_code, 409)
        self.assertTrue(Livro.objects.filter(pk=livro.pk).exists())


class ConcorrenciaPublicacaoTests(TransactionTestCase):
    def setUp(self):
        self.autor = usuario('autor-concorrente', 'autor')
        self.admin = usuario('admin-concorrente', 'admin', True)
        self.categoria = Categoria.objects.create(nome='Concorrência')
        self.livro = Livro.objects.create(titulo='Concorrente', categoria=self.categoria, origem='autor_independente', status='pendente')
        self.solicitacao = SolicitacaoPublicacao.objects.create(usuario=self.autor, livro=self.livro)

    def test_duas_aprovacoes_geram_um_unico_evento(self):
        barreira = Barrier(2)
        def aprovar():
            close_old_connections()
            try:
                admin = User.objects.get(pk=self.admin.pk)
                barreira.wait(timeout=10)
                fluxo.analisar_publicacao(admin, self.solicitacao.pk, 'aprovar')
                return 200
            except fluxo.ConflitoPublicacao:
                return 409
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futuros = [pool.submit(aprovar) for _ in range(2)]
            resultados = [f.result(timeout=20) for f in futuros]
        self.assertEqual(sorted(resultados), [200, 409])
        self.assertEqual(EventoPublicacao.objects.filter(acao='aprovada').count(), 1)

    def test_retirada_bloqueia_envio_concorrente(self):
        conta_bloqueada = Event()
        envio_iniciado = Event()
        registrar_original = fluxo._registrar
        def registrar(*args, **kwargs):
            if args[2] == 'retirada':
                conta_bloqueada.set()
                if not envio_iniciado.wait(timeout=10):
                    raise RuntimeError('Envio concorrente não iniciou')
            return registrar_original(*args, **kwargs)
        def retirar():
            close_old_connections()
            try:
                fluxo.retirar_obra(User.objects.get(pk=self.autor.pk), self.livro.pk)
            finally:
                connections.close_all()
        def enviar():
            close_old_connections()
            try:
                self.assertTrue(conta_bloqueada.wait(timeout=10))
                autor = User.objects.get(pk=self.autor.pk)
                envio_iniciado.set()
                fluxo.enviar_obra(autor, {})
                return 201
            except fluxo.ConflitoPublicacao:
                return 409
            finally:
                connections.close_all()
        with patch('biblioteca.publicacao._registrar', side_effect=registrar):
            with ThreadPoolExecutor(max_workers=2) as pool:
                retirada, envio = pool.submit(retirar), pool.submit(enviar)
                retirada.result(timeout=20)
                self.assertEqual(envio.result(timeout=20), 409)
        self.assertEqual(Livro.objects.count(), 1)


class MigrationPublicacaoTests(TransactionTestCase):
    def test_migra_denuncias_existentes_com_protocolos_unicos_e_preserva_solicitacao(self):
        from django.db import connection
        from django.db.migrations.executor import MigrationExecutor
        anterior = [('biblioteca', '0010_acervo_alternativa_b')]
        atual = [('biblioteca', '0011_denuncia_decisao_denuncia_evidencias_and_more')]
        executor = MigrationExecutor(connection)
        executor.migrate(anterior)
        try:
            apps = executor.loader.project_state(anterior).apps
            autor = apps.get_model('auth', 'User').objects.create(username='autor-migration')
            categoria = apps.get_model('biblioteca', 'Categoria').objects.create(nome='Migration')
            livro = apps.get_model('biblioteca', 'Livro').objects.create(
                titulo='Legado', categoria_id=categoria.pk, autor='Autor', origem='autor_independente', pdf='livros/legado.pdf',
            )
            solicitacao = apps.get_model('biblioteca', 'SolicitacaoPublicacao').objects.create(
                livro_id=livro.pk, usuario_id=autor.pk, status='aprovado', observacao_admin='Decisão antiga',
            )
            for motivo in ['Primeira', 'Segunda']:
                apps.get_model('biblioteca', 'Denuncia').objects.create(livro_id=livro.pk, motivo=motivo)
            executor = MigrationExecutor(connection)
            executor.migrate(atual)
            self.assertEqual(Denuncia.objects.values('protocolo').distinct().count(), 2)
            tentativa = TentativaPublicacao.objects.get(solicitacao_id=solicitacao.pk)
            self.assertEqual(tentativa.status, 'aprovado')
            self.assertEqual(tentativa.dados['titulo'], 'Legado')
            self.assertEqual(tentativa.pdf.name, 'livros/legado.pdf')
            self.assertEqual(tentativa.motivo, 'Decisão antiga')
            self.assertEqual(tentativa.criada_em, solicitacao.data_envio)
        finally:
            MigrationExecutor(connection).migrate(atual)
