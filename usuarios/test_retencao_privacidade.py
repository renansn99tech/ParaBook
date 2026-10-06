from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.exceptions import TokenError

from biblioteca.models import Categoria, DeclaracaoAutoria, Livro, SolicitacaoPublicacao
from comunidades.models import Comunidade, PostagemComunidade, RespostaPostagem
from perfis.models import Perfil
from usuarios.models import DestinoDescarte, EventoGovernancaConta, PreservacaoDados, ProvaPrivacidade, SessaoDispositivo, SolicitacaoSuporte, Usuario
from usuarios.privacidade_conta import encerrar_conta, reconciliar_contas_restauradas
from usuarios.privacidade_descarte import executar_descarte_banco, preview_descarte
from usuarios.privacidade_storage import executar_descarte_storage, preview_storage
from usuarios.retencao import avaliar_destino, limite_retencao


class RetencaoContaTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username='conta-retencao', password='SenhaForte123!')
        self.custom = Usuario.objects.create(user_auth=self.user, nome='Titular')
        self.perfil = Perfil.objects.create(usuario=self.user)
        self.outro = User.objects.create_user(username='outro-retencao', password='x')

    def executar_banco(self, encerramento):
        item = encerramento.destinos.get(destino='banco', recurso='auth.User')
        preview = preview_descarte(encerramento)
        return executar_descarte_banco(encerramento=encerramento, item_protocolo=item.protocolo, confirmacao=preview['confirmacao'])

    def test_purga_preserva_prova_minima_e_suporte_com_prazo_proprio(self):
        self.custom.data_nascimento_eligibilidade = timezone.localdate().replace(year=2000)
        self.custom.save()
        evento = EventoGovernancaConta.objects.create(usuario=self.user, tipo='papel_alterado', motivo='Texto restrito',
            metadados={'papel_anterior': 'leitor', 'papel_novo': 'autor'})
        suporte = SolicitacaoSuporte.objects.create(usuario=self.user, assunto='Caso', mensagem='Mensagem própria')
        encerramento = encerrar_conta(self.user)
        self.executar_banco(encerramento)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        suporte.refresh_from_db()
        self.assertIsNone(suporte.usuario_id)
        self.assertTrue(ProvaPrivacidade.objects.filter(evento_ref=evento.protocolo, classe='R09').exists())
        prova = ProvaPrivacidade.objects.get(classe='R10')
        self.assertNotIn('2000', prova.conteudo_cifrado)
        self.assertEqual(prova.expira_em, limite_retencao('R10', encerramento.encerrada_em))
        self.assertEqual(encerramento.destinos.get(recurso='usuarios.SolicitacaoSuporte').estado, 'impedido')

    def test_purga_nao_remove_estante_terceira_nem_prova_de_autoria(self):
        from biblioteca.models import Biblioteca
        livro = Livro.objects.create(titulo='Obra própria', autor='Nome original', categoria=Categoria.objects.create(nome='Ensaio'))
        sol = SolicitacaoPublicacao.objects.create(usuario=self.user, livro=livro)
        DeclaracaoAutoria.objects.create(solicitacao=sol, cpf_digest='a'*64, cpf_final='1234', versao_termos='v1')
        estante = Biblioteca.objects.create(user=self.outro, livro=livro)
        encerramento = encerrar_conta(self.user)
        self.executar_banco(encerramento)
        self.assertTrue(Biblioteca.objects.filter(pk=estante.pk).exists())
        livro.refresh_from_db()
        self.assertEqual(livro.status, 'retirado')
        self.assertEqual(livro.autor, 'Autor indisponível')
        self.assertTrue(ProvaPrivacidade.objects.filter(classe='R09', recurso='biblioteca.DeclaracaoAutoria').exists())

    def test_preview_antigo_e_repeticao_nao_geram_novo_descarte(self):
        encerramento = encerrar_conta(self.user)
        item = encerramento.destinos.get(recurso='auth.User')
        preview = preview_descarte(encerramento)
        SolicitacaoSuporte.objects.create(usuario=self.user, assunto='Novo caso', mensagem='Chegou após a prévia')
        with self.assertRaises(ValidationError):
            executar_descarte_banco(encerramento=encerramento, item_protocolo=item.protocolo, confirmacao=preview['confirmacao'])
        resultado = self.executar_banco(encerramento)
        encerramento.refresh_from_db()
        preview = preview_descarte(encerramento)
        repetida = executar_descarte_banco(encerramento=encerramento, item_protocolo=item.protocolo, confirmacao=preview['confirmacao'])
        self.assertEqual(resultado.concluido_em, repetida.concluido_em)

    def test_falha_de_prova_reverte_purga_e_permite_retomada(self):
        EventoGovernancaConta.objects.create(usuario=self.user, tipo='papel_alterado', motivo='Registro', metadados={})
        encerramento = encerrar_conta(self.user)
        with patch('usuarios.privacidade_descarte.registrar_prova', side_effect=RuntimeError('Segredo que não vai para log')):
            with self.assertRaises(RuntimeError):
                self.executar_banco(encerramento)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())
        self.assertEqual(encerramento.destinos.get(recurso='auth.User').estado, 'pendente')
        self.executar_banco(encerramento)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_preservacao_em_uma_dependencia_nao_preserva_outros_destinos(self):
        PreservacaoDados.objects.create(destino='banco', recurso='perfis.Perfil', recurso_ref=str(self.perfil.pk),
            motivo_codigo='processo_identificado', revisar_em=timezone.now() + timedelta(days=90))
        encerramento = encerrar_conta(self.user)
        preview = preview_descarte(encerramento)
        conta = next(i for i in preview['itens'] if i['recurso'] == 'auth.User')
        self.assertEqual(conta['motivo_codigo'], 'dependencia_preservada')
        self.assertEqual(conta['estado'], 'impedido')
        self.assertFalse(any(i['estado'] == 'preservado' for i in preview['itens'] if i['destino'] != 'banco'))

    @override_settings(PRIVACY_EVIDENCE_KEY='')
    def test_sem_chave_encerra_acesso_e_impede_purga_da_data_declarada(self):
        self.custom.data_nascimento_eligibilidade = timezone.localdate().replace(year=2000)
        self.custom.save()
        encerramento = encerrar_conta(self.user)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        preview = preview_descarte(encerramento)
        self.assertEqual(next(i for i in preview['itens'] if i['recurso'] == 'auth.User')['estado'], 'impedido')

    def test_encerramento_revoga_jwt_e_repete_sem_duplicar_fila(self):
        refresh = RefreshToken.for_user(self.user)
        cliente = APIClient()
        cliente.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        encerramento = encerrar_conta(self.user)
        self.assertEqual(OutstandingToken.objects.get(jti=refresh['jti']).token, '')
        with self.assertRaises(TokenError):
            RefreshToken(str(refresh))
        self.assertEqual(cliente.get('/api/v1/auth/profile/').status_code, 401)
        self.assertEqual(encerrar_conta(self.user).pk, encerramento.pk)

    def test_restore_revoga_conta_mas_nao_atinge_id_reutilizado(self):
        encerramento = encerrar_conta(self.user)
        User.objects.filter(pk=self.user.pk).update(is_active=True)
        self.user.refresh_from_db()
        refresh_restaurado = RefreshToken.for_user(self.user)
        resultado = reconciliar_contas_restauradas([encerramento])
        self.assertEqual(resultado['revogadas'], 1)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(OutstandingToken.objects.get(jti=refresh_restaurado['jti']).token, '')
        with self.assertRaises(TokenError):
            RefreshToken(str(refresh_restaurado))
        errado = SimpleNamespace(conta_id_original=self.outro.pk, conta_criada_em=encerramento.conta_criada_em)
        self.assertEqual(reconciliar_contas_restauradas([errado])['conflitos'], 1)
        self.outro.refresh_from_db()
        self.assertTrue(self.outro.is_active)

    def test_recurso_pendente_bloqueia_pdf_e_decisao_inicia_prazo_correto(self):
        from biblioteca.models import EventoPublicacao, RecursoPublicacao
        livro = Livro.objects.create(titulo='Obra', autor='Autora', categoria=Categoria.objects.create(nome='Ensaio recurso'))
        SolicitacaoPublicacao.objects.create(usuario=self.user, livro=livro)
        livro.pdf.save('recurso-sintetico.pdf', ContentFile(b'%PDF-1.4\n%%EOF'))
        evento = EventoPublicacao.objects.create(livro=livro, ator=self.user, acao='retirada', anterior='publicado', posterior='retirado')
        recurso = RecursoPublicacao.objects.create(evento=evento, autor=self.user, fundamento='Pedido sintético')
        encerramento = encerrar_conta(self.user)
        item = encerramento.destinos.get(destino='storage', recurso='biblioteca.Livro')
        antes = preview_descarte(encerramento)
        self.assertEqual(next(i for i in antes['itens'] if i['item'] == str(item.protocolo))['estado'], 'impedido')
        recurso.status = 'recusado'
        recurso.decidido_em = timezone.now()
        recurso.save(update_fields=['status', 'decidido_em'])
        limite = recurso.decidido_em + timedelta(days=30)
        geral = preview_descarte(encerramento, agora=limite)
        storage = preview_storage(item, agora=limite, versoes_conferidas=True)
        linha = next(i for i in geral['itens'] if i['item'] == str(item.protocolo))
        self.assertEqual(linha['limite_em'], limite)
        self.assertEqual(linha['estado'], 'elegivel')
        self.assertEqual(storage['limite_em'], limite)

    def test_objeto_compartilhado_e_falha_storage_nao_sao_descarte_concluido(self):
        self.perfil.foto.save('compartilhada-g5.png', ContentFile(b'imagem-sintetica'))
        nome = self.perfil.foto.name
        outro_perfil = Perfil.objects.create(usuario=self.outro, foto=nome)
        encerramento = encerrar_conta(self.user)
        item = encerramento.destinos.get(destino='storage')
        agora = item.limite_em + timedelta(seconds=1)
        self.assertEqual(preview_storage(item, agora=agora)['estado'], 'impedido')
        preview = preview_storage(item, agora=agora, versoes_conferidas=True)
        resultado = executar_descarte_storage(item=item, storage=default_storage, agora=agora,
            confirmacao=preview['confirmacao'], versoes_conferidas=True)
        self.assertEqual(resultado.estado, 'preservado')
        self.assertTrue(default_storage.exists(nome))
        outro_perfil.foto = ''
        outro_perfil.save(update_fields=['foto'])
        item.refresh_from_db()
        preview = preview_storage(item, agora=agora, versoes_conferidas=True)
        with patch.object(default_storage, 'delete', side_effect=OSError('Falha sintética')):
            resultado = executar_descarte_storage(item=item, storage=default_storage, agora=agora,
                confirmacao=preview['confirmacao'], versoes_conferidas=True)
        self.assertEqual(resultado.estado, 'impedido')
        item.refresh_from_db()
        preview = preview_storage(item, agora=agora, versoes_conferidas=True)
        resultado = executar_descarte_storage(item=item, storage=default_storage, agora=agora,
            confirmacao=preview['confirmacao'], versoes_conferidas=True)
        self.assertEqual(resultado.estado, 'concluido')
        self.assertFalse(default_storage.exists(nome))

    def test_evento_desconhecido_preservacao_e_liberacao_nao_reiniciam_prazo(self):
        agora = timezone.now()
        self.assertEqual(avaliar_destino(classe='R07', evento_em=None, agora=agora)['estado'], 'impedido')
        inicio = agora - timedelta(days=100)
        causa = SimpleNamespace(liberada_em=None)
        preservado = avaliar_destino(classe='R04', evento_em=inicio, agora=agora, preservacoes=[causa])
        causa.liberada_em = agora
        liberado = avaliar_destino(classe='R04', evento_em=inicio, agora=agora, preservacoes=[causa])
        self.assertEqual(preservado['estado'], 'preservado')
        self.assertEqual(liberado['estado'], 'elegivel')
        self.assertEqual(preservado['limite_em'], liberado['limite_em'])

    def test_suporte_encerra_com_marco_explicito_e_descarta_apenas_apos_180_dias(self):
        suporte = SolicitacaoSuporte.objects.create(usuario=self.user, assunto='Caso', mensagem='Texto',
            status='encerrada', encerrada_em=timezone.now())
        encerramento = encerrar_conta(self.user)
        item = encerramento.destinos.get(recurso='usuarios.SolicitacaoSuporte')
        antes = preview_descarte(encerramento)
        self.assertEqual(next(i for i in antes['itens'] if i['item'] == str(item.protocolo))['estado'], 'pendente')
        depois = suporte.encerrada_em + timedelta(days=180)
        preview = preview_descarte(encerramento, agora=depois)
        executar_descarte_banco(encerramento=encerramento, item_protocolo=item.protocolo,
            confirmacao=preview['confirmacao'], agora=depois)
        self.assertFalse(SolicitacaoSuporte.objects.filter(pk=suporte.pk).exists())

    @override_settings(PRIVACY_EVIDENCE_KEY='')
    def test_comunidade_preservada_sem_chave_nao_expoe_nem_perde_texto(self):
        from comunidades.api.serializers import ComunidadeSerializer
        comunidade = Comunidade.objects.create(criador=self.user, nome='Nome identificável', descricao='Texto preservado')
        PreservacaoDados.objects.create(destino='banco', recurso=comunidade._meta.label, recurso_ref=str(comunidade.pk),
            motivo_codigo='processo_identificado', revisar_em=timezone.now() + timedelta(days=90))
        encerrar_conta(self.user)
        comunidade.refresh_from_db()
        self.assertEqual(comunidade.descricao, 'Texto preservado')
        self.assertEqual(comunidade.descricao_publica, '')
        self.assertEqual(ComunidadeSerializer(comunidade).data['nome'], 'Comunidade')
        self.assertIsNone(ComunidadeSerializer(comunidade).data['criador'])

    def test_prova_vencida_preservada_e_liberada_sem_reiniciar_prazo(self):
        from usuarios.privacidade_provas import registrar_prova, preview_prova, executar_descarte_prova
        agora = timezone.now()
        prova = registrar_prova(usuario=self.user, classe='R13', conteudo={
            'recurso': 'comunidades.PostagemComunidade', 'referencia': '123', 'conteudo': 'Restrito'}, expira_em=agora - timedelta(days=1))
        causa = PreservacaoDados.objects.create(destino='banco', recurso=prova.recurso, recurso_ref=prova.recurso_ref,
            motivo_codigo='processo_identificado', revisar_em=agora + timedelta(days=90))
        self.assertEqual(preview_prova(prova, agora=agora)['estado'], 'preservado')
        with self.assertRaises(ValidationError):
            executar_descarte_prova(prova=prova, agora=agora)
        causa.liberada_em = agora
        causa.save(update_fields=['liberada_em'])
        self.assertEqual(preview_prova(prova, agora=agora)['limite_em'], prova.expira_em)
        self.assertEqual(executar_descarte_prova(prova=prova, agora=agora)['estado'], 'concluido')
        self.assertEqual(executar_descarte_prova(prova=prova, agora=agora)['estado'], 'concluido')
