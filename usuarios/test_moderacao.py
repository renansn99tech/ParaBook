import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from io import BytesIO
from unittest.mock import patch
from uuid import uuid4

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.models import Permission
from django.http import Http404
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import close_old_connections, connection, connections
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from pypdf import PdfWriter
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from biblioteca.models import Categoria, Denuncia, Livro, SolicitacaoPublicacao
from biblioteca.publicacao import ConflitoPublicacao, restaurar_obra
from comunidades.models import Comunidade
from perfis.models import Perfil
from usuarios import moderacao as m
from usuarios.governanca import aplicar_suspensao
from usuarios.models import AuditoriaAcao, PreservacaoDados, SolicitacaoSuporte, Usuario
from usuarios.models_moderacao import AprovacaoConselho, CasoModeracao, EventoModeracao, ImpedimentoModeracao, PedidoConselho, RecursoModeracao
from usuarios.operacao_moderacao import BRASILIA


class ModeracaoBase:
    def preparar(self):
        self.admin = User.objects.create_superuser(username='g3-admin', password='sintetica')
        self.segundo = User.objects.create_superuser(username='g3-segundo', password='sintetica')
        self.user = User.objects.create_user(username='g3-titular', password='sintetica')
        self.outro = User.objects.create_user(username='g3-outro', password='sintetica')
        self.mod = User.objects.create_user(username='g3-moderador', password='sintetica', is_staff=True)
        for user, papel in ((self.user, 'leitor'), (self.outro, 'leitor'), (self.mod, 'moderador')):
            perfil = Perfil.objects.create(usuario=user)
            Usuario.objects.create(user_auth=user, perfil=perfil, tipo=papel, termos_aceitos=True, versao_termos_aceita=settings.TERMS_VERSION)
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        self.publico = APIClient()
        self.categoria = Categoria.objects.create(nome='G3 sintético')

    def entrada(self, **dados):
        return {'categoria': 'privacidade', 'relato': 'Relato sintético mínimo de uma situação para investigação.',
                'referencia': 'Conteúdo sintético de teste', 'chave_idempotencia': uuid4(), 'segredo': secrets.token_hex(32),
                **dados}

    def novo(self, **dados):
        return m.receber_publica(self.entrada(**dados))

    def operar(self, caso, acao, ator=None, **dados):
        return m.operar_caso(ator or self.admin, caso.protocolo, {'acao': acao, 'chave_idempotencia': uuid4(), **dados})

    def triagem(self, caso, ator=None, **dados):
        return self.operar(caso, 'triagem', ator, prioridade='P2', **dados)

    def decisao(self, caso, ator=None, **dados):
        return self.operar(caso, 'decidir', ator, medida='orientacao', resposta='Orientação sintética sem dados de terceiros.',
            regra='Diretrizes da comunidade', evidencia_ref='EVIDENCIA-SINTETICA-001', senha_atual='sintetica', **dados)

    def livro(self, pdf=False):
        livro = Livro.objects.create(titulo='Obra sintética G3', autor='Autor sintético', categoria=self.categoria)
        SolicitacaoPublicacao.objects.create(usuario=self.user, livro=livro)
        if pdf:
            writer = PdfWriter(); writer.add_blank_page(width=100, height=100)
            stream = BytesIO(); writer.write(stream)
            livro.pdf = SimpleUploadedFile('g3.pdf', stream.getvalue(), content_type='application/pdf')
            livro.save()
        return livro

    def pedido(self, caso, acao='remover'):
        self.operar(caso, 'conselho_solicitar', conselho_acao=acao, motivo='Fundamento sintético e impacto mínimo conferidos.', senha_atual='sintetica')
        return caso.pedidos_conselho.latest('pk')

    def aprovar(self, caso, pedido, ator):
        return self.operar(caso, 'conselho_aprovar', ator, pedido=pedido.protocolo,
                           motivo='Aprovação sintética com fundamento registrado.', senha_atual='sintetica')

    def executar(self, caso, pedido):
        return self.operar(caso, 'conselho_executar', pedido=pedido.protocolo,
            motivo='Execução sintética após conferência das duas aprovações.', senha_atual='sintetica',
            resposta='Decisão do Conselho disponível ao titular no protocolo.', regra='Rito excepcional do Conselho', evidencia_ref='CONSELHO-TESTE')


class ModeracaoTests(ModeracaoBase, TestCase):
    def setUp(self):
        self.preparar()

    def test_entrada_publica_anonima_nao_expoe_relato_contato_ou_segredo(self):
        dados = self.entrada(contato='sintetico@example.invalid')
        r = self.publico.post(reverse('api_denuncia_publica'), dados, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertIsNone(r.data['confirmado_em'])
        self.assertIsNone(r.data['decidido_em'])
        self.assertEqual(r['Cache-Control'], 'no-store')
        caso = CasoModeracao.objects.get(protocolo=r.data['protocolo'])
        self.assertNotIn(dados['relato'], caso.dados_cifrados)
        self.assertNotIn(dados['segredo'], str(r.data))
        self.assertNotIn('example.invalid', str(list(AuditoriaAcao.objects.values())))

    def test_retentar_envio_devolve_mesmo_protocolo(self):
        dados = self.entrada()
        primeiro, segundo = m.receber_publica(dados), m.receber_publica(dados)
        self.assertEqual(primeiro.pk, segundo.pk)
        self.assertEqual(CasoModeracao.objects.count(), 1)

    def test_chave_publica_nao_aceita_outro_segredo_ou_conteudo(self):
        dados = self.entrada(); m.receber_publica(dados)
        for novo in ({**dados, 'segredo': secrets.token_hex(32)}, {**dados, 'relato': 'Outro relato sintético com mais de vinte caracteres.'}):
            with self.assertRaises(m.ConflitoModeracao):
                m.receber_publica(novo)

    def test_codigo_errado_ou_protocolos_distintos_sao_negados(self):
        dados = self.entrada(); caso = m.receber_publica(dados)
        for protocolo, segredo in ((caso.protocolo, secrets.token_hex(32)), (uuid4(), dados['segredo'])):
            r = self.publico.post(reverse('api_denuncia_acompanhamento'), {'protocolo': protocolo, 'segredo': segredo}, format='json')
            self.assertEqual(r.status_code, 403)
            self.assertNotIn(dados['relato'], str(r.data))

    def test_categorias_e_trilha_autoral_minima(self):
        r = self.publico.post(reverse('api_denuncia_publica'), self.entrada(categoria='direitos_autorais'), format='json')
        self.assertEqual(r.status_code, 400)
        r = self.publico.post(reverse('api_denuncia_publica'), self.entrada(categoria='direitos_autorais', titularidade='Titularidade alegada sintética', evidencia='Referência sintética de autoria'), format='json')
        self.assertEqual(r.status_code, 201)
        caso = self.novo(categoria='protecao_infantojuvenil')
        self.assertEqual(caso.prioridade, 'P0')

    def test_honeypot_e_validacao_impedem_envio(self):
        r = self.publico.post(reverse('api_denuncia_publica'), self.entrada(website='bot.example.invalid'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(CasoModeracao.objects.exists())

    def test_limite_compartilhado_nao_confia_em_forwarded_for(self):
        for _ in range(10):
            r = self.publico.post(reverse('api_denuncia_publica'), self.entrada(), format='json', HTTP_X_FORWARDED_FOR=secrets.token_hex(4))
            self.assertEqual(r.status_code, 201)
        r = self.publico.post(reverse('api_denuncia_publica'), self.entrada(), format='json')
        self.assertEqual(r.status_code, 429)
        self.assertEqual(CasoModeracao.objects.count(), 10)

    @override_settings(PRIVACY_EVIDENCE_KEY='')
    def test_falta_chave_falha_sem_relato_claro(self):
        with self.assertRaises(ValidationError):
            self.novo()
        self.assertFalse(CasoModeracao.objects.exists())

    def test_auditoria_obrigatoria_reverte_recebimento(self):
        with patch('usuarios.moderacao.AuditoriaAcao.objects.create', side_effect=RuntimeError('falha sintética')):
            with self.assertRaises(RuntimeError):
                self.novo()
        self.assertFalse(CasoModeracao.objects.exists())

    def test_fila_restrita_e_sem_efeito_de_escrita_no_get(self):
        self.novo()
        antes = EventoModeracao.objects.count()
        self.assertEqual(self.publico.get(reverse('api_casos_moderacao')).status_code, 401)
        self.api.force_authenticate(self.user)
        self.assertEqual(self.api.get(reverse('api_casos_moderacao')).status_code, 403)
        self.assertEqual(EventoModeracao.objects.count(), antes)

    def test_sincronizacao_preserva_originais_sem_duplicar(self):
        suporte = SolicitacaoSuporte.objects.create(usuario=self.user, assunto='Teste sintético', mensagem='Mensagem sintética mínima.', categoria='idade')
        denuncia = Denuncia.objects.create(usuario=self.user, livro=self.livro(), motivo='Teste mínimo')
        self.assertEqual(m.sincronizar_origens(self.admin), 2)
        self.assertEqual(m.sincronizar_origens(self.admin), 0)
        self.assertEqual(CasoModeracao.objects.get(origem='suporte').origem_id, suporte.pk)
        self.assertEqual(CasoModeracao.objects.get(origem='obra').origem_id, denuncia.pk)

    def test_p0_p1_negados_ao_moderador_sem_rebaixamento_implicito(self):
        caso = self.novo(risco_imediato=True)
        with self.assertRaises(PermissionDenied):
            self.operar(caso, 'assumir', self.mod)
        with self.assertRaises(PermissionDenied):
            self.triagem(caso, self.mod)

    def test_moderador_p2_pode_assumir_triar_decidir_orientacao(self):
        caso = self.novo()
        self.operar(caso, 'assumir', self.mod)
        self.triagem(caso, self.mod)
        caso = self.decisao(caso, self.mod)
        self.assertEqual(caso.decisor_id, self.mod.pk)
        self.assertEqual(caso.estado, 'decidido')

    def test_segundo_operador_nao_toma_caso_assumido(self):
        caso = self.novo(); self.operar(caso, 'assumir')
        with self.assertRaises(m.ConflitoModeracao):
            self.operar(caso, 'assumir', self.segundo)

    def test_decisao_sem_triagem_ou_senha_nao_ocorre(self):
        caso = self.novo()
        with self.assertRaises(m.ConflitoModeracao):
            self.decisao(caso)
        self.triagem(caso)
        dados = {'acao': 'decidir', 'chave_idempotencia': uuid4(), 'medida': 'orientacao', 'resposta': 'Resposta sintética completa.', 'regra': 'Regra', 'evidencia_ref': 'REF', 'senha_atual': 'errada'}
        with self.assertRaises(ValidationError):
            m.operar_caso(self.admin, caso.protocolo, dados)
        caso.refresh_from_db(); self.assertIsNone(caso.decidido_em)

    def test_retentar_operacao_nao_duplica_evento_e_payload_alterado_falha(self):
        caso = self.novo(); chave = uuid4()
        dados = {'acao': 'assumir', 'chave_idempotencia': chave}
        m.operar_caso(self.admin, caso.protocolo, dados); m.operar_caso(self.admin, caso.protocolo, dados)
        self.assertEqual(EventoModeracao.objects.filter(chave=chave).count(), 1)
        with self.assertRaises(m.ConflitoModeracao):
            m.operar_caso(self.segundo, caso.protocolo, dados)

    def test_sem_calendario_nao_inventa_sla(self):
        caso = self.triagem(self.novo())
        self.assertIsNone(caso.decisao_ate)
        self.assertEqual(m.dados_operacionais(caso, self.admin)['prazos']['triagem']['estado'], 'nao_calculado')

    def test_calendario_confere_feriado_janelas_e_prazos(self):
        cal = m.conferir_calendario(self.admin, {'inicio': datetime(2026, 10, 1).date(), 'fim': datetime(2026, 11, 30).date(),
            'feriados': [datetime(2026, 10, 12).date()], 'referencia': 'Calendário sintético conferido', 'senha_atual': 'sintetica'})
        caso = self.novo(); caso.recebido_em = datetime(2026, 10, 10, 14, tzinfo=BRASILIA); caso.save()
        caso = self.operar(caso, 'triagem', prioridade='P0', calendario_id=cal.pk)
        self.assertEqual(caso.triagem_ate.astimezone(BRASILIA), datetime(2026, 10, 13, 14, tzinfo=BRASILIA))

    def test_calendario_insuficiente_reverte_triagem(self):
        cal = m.conferir_calendario(self.admin, {'inicio': timezone.localdate(), 'fim': timezone.localdate(), 'feriados': [], 'referencia': 'Intervalo sintético insuficiente', 'senha_atual': 'sintetica'})
        caso = self.novo()
        with self.assertRaises(ValidationError):
            self.triagem(caso, calendario_id=cal.pk)
        caso.refresh_from_db(); self.assertIsNone(caso.triado_em)

    def test_confirmacao_humana_e_decisao_disponivel_sao_distintas(self):
        caso = self.triagem(self.novo())
        self.operar(caso, 'confirmar', resposta='Recebimento confirmado por atendimento humano.')
        caso = self.decisao(caso)
        self.assertEqual(m.dados_publicos(caso)['resposta'], '')
        self.assertEqual(caso.retorno_estado, 'pendente')
        caso = self.operar(caso, 'comunicar')
        self.assertIn('Orientação', m.dados_publicos(caso)['resposta'])
        self.assertEqual(caso.retorno_estado, 'disponivel')

    def test_consulta_registra_visualizacao_sem_afirmar_email(self):
        dados = self.entrada(); caso = m.receber_publica(dados); self.triagem(caso); self.decisao(caso); self.operar(caso, 'comunicar')
        r = self.publico.post(reverse('api_denuncia_acompanhamento'), {'protocolo': caso.protocolo, 'segredo': dados['segredo']}, format='json')
        self.assertEqual(r.status_code, 200); self.assertEqual(r.data['retorno_estado'], 'consultado')

    def test_complemento_so_quando_solicitado_e_idempotente(self):
        dados = self.entrada(); caso = m.receber_publica(dados)
        complemento = {'protocolo': caso.protocolo, 'segredo': dados['segredo'], 'relato': 'Complemento sintético solicitado para a análise.', 'chave_idempotencia': uuid4()}
        with self.assertRaises(m.ConflitoModeracao):
            m.complementar_publica(complemento)
        self.triagem(caso); self.operar(caso, 'complemento', resposta='Favor complementar a referência mínima do conteúdo.')
        m.complementar_publica(complemento); m.complementar_publica(complemento)
        caso.refresh_from_db(); self.assertEqual(caso.estado, 'em_analise')
        self.assertEqual(caso.eventos.filter(acao='complemento_recebido').count(), 1)

    def test_encerramento_exige_retorno_e_inicia_retencao(self):
        caso = self.triagem(self.novo()); self.decisao(caso)
        with self.assertRaises(m.ConflitoModeracao):
            self.operar(caso, 'encerrar')
        self.operar(caso, 'comunicar'); caso = self.operar(caso, 'encerrar')
        self.assertEqual(caso.estado, 'encerrado')
        self.assertEqual(m.preview_retencao_caso(caso)['estado'], 'pendente')

    def test_revisao_g2_nao_pode_ser_encerrada_pelo_g3(self):
        suporte = SolicitacaoSuporte.objects.create(usuario=self.user, categoria='idade', assunto='Revisão', mensagem='Pedido sintético de revisão de idade.')
        m.sincronizar_origens(self.admin); caso = CasoModeracao.objects.get(origem='suporte', origem_id=suporte.pk); self.triagem(caso)
        with self.assertRaises(ValidationError):
            self.decisao(caso)
        suporte.refresh_from_db(); self.assertEqual(suporte.status, 'aberta')

    def test_operador_nao_decide_contra_si_proprio(self):
        caso = self.triagem(self.novo(), alvo_tipo='conta', alvo_id=self.admin.pk)
        with self.assertRaises(PermissionDenied):
            self.decisao(caso)

    def test_conteudo_recebe_contencao_reversivel(self):
        livro = self.livro(); caso = self.triagem(self.novo(), alvo_tipo='livro', alvo_id=livro.pk)
        dados = {'acao': 'decidir', 'chave_idempotencia': uuid4(), 'medida': 'restricao_conteudo', 'resposta': 'Contenção reversível do conteúdo durante análise.', 'regra': 'Diretriz', 'evidencia_ref': 'EVD', 'senha_atual': 'sintetica'}
        m.operar_caso(self.admin, caso.protocolo, dados); livro.refresh_from_db()
        self.assertEqual(livro.status, 'suspenso'); self.assertIsNone(livro.removido_definitivamente_em)

    def test_auditoria_falha_reverte_medida_e_decisao(self):
        livro = self.livro(); caso = self.triagem(self.novo(), alvo_tipo='livro', alvo_id=livro.pk)
        with patch('usuarios.moderacao._evento', side_effect=RuntimeError('falha sintética')):
            with self.assertRaises(RuntimeError):
                self.decisao(caso)
        caso.refresh_from_db(); self.assertIsNone(caso.decidido_em)

    def test_recurso_somente_do_alvo_e_do_escopo_elegivel(self):
        caso = self.triagem(self.novo(), alvo_tipo='conta', alvo_id=self.user.pk); caso = self.decisao(caso)
        with self.assertRaises(Http404):
            m.recorrer_caso(self.user, caso.protocolo, {'fundamento': 'Fundamento mínimo sintético de recurso.', 'chave_idempotencia': uuid4()})

    def test_recurso_suspensao_pode_revogar_com_autorizacao(self):
        suspensao = aplicar_suspensao(ator=self.admin, alvo_id=self.user.pk, duracao_dias=3, categoria='conduta', justificativa='Suspensão sintética com motivo explícito.', senha_atual='sintetica')
        m.sincronizar_origens(self.admin); caso = CasoModeracao.objects.get(origem='suspensao', origem_id=suspensao.pk)
        dados = {'fundamento': 'Fundamento mínimo sintético de recurso.', 'chave_idempotencia': uuid4()}
        atendimento = m.recorrer_caso(self.user, caso.protocolo, dados)
        self.assertEqual(atendimento.pk, m.recorrer_caso(self.user, caso.protocolo, dados).pk)
        self.triagem(atendimento)
        atendimento = self.operar(atendimento, 'recurso_decidir', acolher=True, resposta='Recurso acolhido e suspensão revogada neste evento.', regra='Proporcionalidade', evidencia_ref='RECURSO-001', senha_atual='sintetica')
        suspensao.refresh_from_db(); self.assertEqual(suspensao.status, 'revogada')
        self.assertEqual(RecursoModeracao.objects.get(atendimento=atendimento).estado, 'acolhido')

    def test_meus_casos_nao_expoem_ator_relato_alheio_ou_evidencia_interna(self):
        caso = self.novo(); caso.usuario = self.user; caso.save()
        self.api.force_authenticate(self.user)
        r = self.api.get(reverse('api_meus_casos'))
        self.assertEqual(r.status_code, 200)
        for campo in ('ator', 'evidencia_ref', 'dados_atendimento', 'eventos', 'decisor'):
            self.assertNotIn(campo, r.data[0])
        self.api.force_authenticate(self.outro)
        self.assertEqual(self.api.get(reverse('api_meus_casos')).data, [])

    def test_api_valida_campos_por_acao(self):
        caso = self.novo()
        r = self.api.post(reverse('api_caso_moderacao', args=[caso.protocolo]), {'acao': 'decidir', 'chave_idempotencia': uuid4()}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('senha_atual', r.data)

    def test_paginacao_nao_oculta_casos_antigos(self):
        CasoModeracao.objects.bulk_create([CasoModeracao(origem='publica', categoria='privacidade') for _ in range(51)])
        r = self.api.get(reverse('api_casos_moderacao'))
        self.assertEqual(r.status_code, 200); self.assertEqual(r.data['total'], 51); self.assertEqual(len(r.data['resultados']), 50)
        r = self.api.get(reverse('api_casos_moderacao'), {'pagina': 2})
        self.assertEqual(len(r.data['resultados']), 1)

    def test_retencao_dados_180_dias_sem_apagar_registro_minimo(self):
        caso = self.triagem(self.novo()); self.decisao(caso); self.operar(caso, 'comunicar'); caso = self.operar(caso, 'encerrar')
        with self.assertRaises(ValidationError):
            m.descartar_atendimento(caso, caso.encerrado_em + timedelta(days=179))
        m.descartar_atendimento(caso, caso.encerrado_em + timedelta(days=180)); caso.refresh_from_db()
        self.assertEqual(caso.dados_cifrados, ''); self.assertEqual(caso.resposta_publica, '')
        self.assertTrue(caso.eventos.exists()); self.assertFalse(caso.eventos.exclude(dados_cifrados='').exists())

    def test_preservacao_impede_descarte_sem_reiniciar_prazo(self):
        caso = self.triagem(self.novo()); self.decisao(caso); self.operar(caso, 'comunicar'); caso = self.operar(caso, 'encerrar')
        p = PreservacaoDados.objects.create(destino='banco', recurso=caso._meta.label, recurso_ref=str(caso.pk), motivo_codigo='incidente', revisar_em=timezone.now() + timedelta(days=90))
        agora = caso.encerrado_em + timedelta(days=181)
        self.assertEqual(m.preview_retencao_caso(caso, agora)['estado'], 'preservado')
        p.liberada_em = agora; p.save()
        self.assertEqual(m.preview_retencao_caso(caso, agora)['estado'], 'elegivel')

    def test_impedimento_no_alvo_tambem_preserva_atendimento(self):
        livro = self.livro()
        caso = self.triagem(self.novo(), alvo_tipo='livro', alvo_id=livro.pk)
        self.decisao(caso); self.operar(caso, 'comunicar'); caso = self.operar(caso, 'encerrar')
        ImpedimentoModeracao.objects.create(recurso=livro._meta.label, recurso_id=livro.pk,
            causa='incidente', referencia='INCIDENTE-SINTETICO')
        with self.assertRaises(ValidationError):
            m.descartar_atendimento(caso, caso.encerrado_em + timedelta(days=181))

    def test_previa_retencao_nao_expoe_conteudo_e_incidente_preserva_minimo_cinco_anos(self):
        from django.core.management import call_command
        from io import StringIO
        livro = self.livro(); caso = self.triagem(self.novo(), alvo_tipo='livro', alvo_id=livro.pk)
        self.decisao(caso); self.operar(caso, 'comunicar'); caso = self.operar(caso, 'encerrar')
        ImpedimentoModeracao.objects.create(recurso=livro._meta.label, recurso_id=livro.pk,
            causa='incidente', referencia='INCIDENTE-SINTETICO', liberada_em=timezone.now())
        saida = StringIO(); call_command('retencao_moderacao', protocolo=caso.protocolo, stdout=saida)
        self.assertIn('INCIDENTE', saida.getvalue())
        self.assertNotIn('relato', saida.getvalue()); self.assertNotIn('contato', saida.getvalue())
        self.assertEqual(m.preview_retencao_caso(caso)['registro_minimo_ate'].year, caso.encerrado_em.year + 5)
        caso.refresh_from_db(); self.assertTrue(caso.dados_cifrados)

    def test_caso_assumido_nao_recebe_decisao_pelo_rito_legado(self):
        livro = self.livro()
        denuncia = Denuncia.objects.create(livro=livro, usuario=self.user, motivo='Sintético', status='pendente')
        m.sincronizar_origens(self.admin)
        caso = CasoModeracao.objects.get(origem='obra', origem_id=denuncia.pk)
        self.operar(caso, 'assumir')
        from biblioteca.publicacao import moderar_denuncia
        with self.assertRaises(m.ConflitoModeracao):
            moderar_denuncia(self.admin, denuncia.pk, 'aprovar', 'Tentativa de decisão sintética em rito paralelo.')
        denuncia.refresh_from_db(); self.assertEqual(denuncia.status, 'pendente')

    def test_operador_herdado_com_permissao_gere_p0_sem_superusuario(self):
        self.mod.user_permissions.add(Permission.objects.get(codename='operar_risco_grave', content_type__app_label='usuarios'))
        caso = self.novo(risco_imediato=True)
        caso = self.operar(caso, 'triagem', self.mod, prioridade='P0')
        self.assertEqual(caso.responsavel_id, self.mod.pk)
        self.assertFalse(self.mod.is_superuser)

    def test_moderador_p2_nao_suspende_pelo_endpoint_herdado(self):
        self.api.force_authenticate(self.mod)
        r = self.api.post(reverse('api-dashboard-usuario-suspensao', args=[self.user.pk]),
            {'duracao_dias': 3, 'categoria': 'conduta', 'justificativa': 'Tentativa de suspensão por moderador P2 novo.', 'senha_atual': 'sintetica'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertFalse(CasoModeracao.objects.exists())

    def test_suspensao_disponivel_para_recurso_sem_sincronizacao_manual(self):
        s = aplicar_suspensao(ator=self.admin, alvo_id=self.user.pk, duracao_dias=3, categoria='conduta', justificativa='Suspensão sintética já vinculada ao seu protocolo.', senha_atual='sintetica')
        caso = CasoModeracao.objects.get(suspensao=s)
        self.api.force_authenticate(self.user)
        r = self.api.get(reverse('api_meus_casos'))
        self.assertTrue(r.data[0]['pode_recorrer']); self.assertIn('Suspensão', r.data[0]['resposta'])
        self.assertEqual(m.sincronizar_origens(self.admin), 0)
        self.assertEqual(CasoModeracao.objects.filter(suspensao=s).count(), 1)

    def test_recurso_antigo_nao_revoga_suspensao_posterior(self):
        s = aplicar_suspensao(ator=self.admin, alvo_id=self.user.pk, duracao_dias=3, categoria='conduta', justificativa='Primeira suspensão sintética para recurso.', senha_atual='sintetica')
        caso = CasoModeracao.objects.get(suspensao=s)
        recurso = m.recorrer_caso(self.user, caso.protocolo, {'fundamento': 'Fundamento sintético sobre a primeira suspensão.', 'chave_idempotencia': uuid4()})
        s.status = 'revogada'; s.save()
        nova = aplicar_suspensao(ator=self.admin, alvo_id=self.user.pk, duracao_dias=3, categoria='conduta', justificativa='Segunda suspensão sintética independente.', senha_atual='sintetica')
        self.triagem(recurso)
        with self.assertRaises(m.ConflitoModeracao):
            self.operar(recurso, 'recurso_decidir', acolher=True, resposta='Tentativa sintética de revogar evento já encerrado.', regra='Regra', evidencia_ref='REF', senha_atual='sintetica')
        nova.refresh_from_db(); self.assertEqual(nova.status, 'ativa')

    def test_suspensao_em_caso_publico_nao_cria_duplo_caso_elegivel(self):
        caso = self.triagem(self.novo(), alvo_tipo='conta', alvo_id=self.user.pk)
        self.operar(caso, 'decidir', medida='suspensao_conta', duracao_dias=3, resposta='Suspensão sintética aplicada neste mesmo protocolo.', regra='Conduta', evidencia_ref='EVD', senha_atual='sintetica')
        self.assertEqual(CasoModeracao.objects.count(), 1)
        caso.refresh_from_db(); self.assertIsNotNone(caso.suspensao_id)

    def test_preparar_conselho_e_idempotente_e_nao_remove(self):
        livro = self.livro()
        dados = {'alvo_tipo': 'livro', 'alvo_id': livro.pk, 'chave_idempotencia': uuid4(),
                 'motivo': 'Preparação sintética para decisão posterior do Conselho.', 'senha_atual': 'sintetica'}
        a = m.preparar_conselho(self.admin, dados); b = m.preparar_conselho(self.admin, dados)
        self.assertEqual(a.pk, b.pk); livro.refresh_from_db(); self.assertEqual(livro.status, 'publicado')
        self.assertFalse(PedidoConselho.objects.exists())

    def test_fila_prioriza_risco_imediato(self):
        self.novo(); urgente = self.novo(risco_imediato=True)
        r = self.api.get(reverse('api_casos_moderacao'))
        self.assertEqual(r.data['resultados'][0]['protocolo'], str(urgente.protocolo))

    def test_moderador_p2_nao_consulta_relato_de_risco_grave(self):
        urgente = self.novo(risco_imediato=True); comum = self.novo()
        self.api.force_authenticate(self.mod)
        resposta = self.api.get(reverse('api_casos_moderacao'))
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual([c['protocolo'] for c in resposta.data['resultados']], [str(comum.protocolo)])
        with self.assertRaises(PermissionDenied):
            m.dados_operacionais(urgente, self.mod)

    def test_admin_nao_exclui_comunidade_pelo_forcar_ou_sendo_criador(self):
        for criador in (self.user, self.admin):
            com = Comunidade.objects.create(nome='Teste Conselho', criador=criador, total_denuncias=20)
            r = self.api.delete(f'/api/v1/comunidades/comunidades/{com.pk}/?forcar=true')
            self.assertEqual(r.status_code, 403); self.assertTrue(Comunidade.objects.filter(pk=com.pk).exists())

    def test_atalhos_legados_nao_apagam_denuncia_ou_comunidade(self):
        from comunidades.models import DenunciaComunidade
        com = Comunidade.objects.create(nome='Legado sintético', criador=self.user)
        denuncia = DenunciaComunidade.objects.create(comunidade=com, usuario=self.user, motivo='Sintético')
        from django.test import Client
        cliente = Client(); cliente.force_login(self.admin)
        for payload in ({'btn_deletar_comunidade': '1', 'comunidade_id': com.pk}, {'btn_ignorar_denuncia_comunidade': '1', 'denuncia_comunidade_id': denuncia.pk}):
            r = cliente.post(reverse('dashboard:painel_admin'), payload)
            self.assertEqual(r.status_code, 409)
        self.assertTrue(Comunidade.objects.filter(pk=com.pk).exists()); self.assertTrue(DenunciaComunidade.objects.filter(pk=denuncia.pk).exists())


class ConselhoTests(ModeracaoBase, TestCase):
    def setUp(self):
        self.preparar()
        self.config = override_settings(MODERATION_COUNCIL_USER_IDS=(self.admin.pk, self.segundo.pk))
        self.config.enable(); self.addCleanup(self.config.disable)
        self.obra = self.livro(pdf=True)
        self.caso = self.triagem(self.novo(), alvo_tipo='livro', alvo_id=self.obra.pk)

    def test_solicitar_nao_executa_remocao(self):
        pedido = self.pedido(self.caso)
        self.obra.refresh_from_db(); self.assertEqual(self.obra.status, 'publicado')
        self.assertEqual(pedido.estado, 'pendente'); self.assertEqual(pedido.aprovacoes.count(), 0)

    def test_uma_identidade_nao_executa_e_nao_aprova_duas_vezes(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin)
        with self.assertRaises(m.ConflitoModeracao):
            self.aprovar(self.caso, pedido, self.admin)
        with self.assertRaises(m.ConflitoModeracao):
            self.executar(self.caso, pedido)
        self.obra.refresh_from_db(); self.assertEqual(self.obra.status, 'publicado')

    @override_settings(MODERATION_COUNCIL_USER_IDS=())
    def test_superusuario_sem_vinculo_nao_e_conselheiro(self):
        pedido = self.pedido(self.caso)
        with self.assertRaises(PermissionDenied):
            self.aprovar(self.caso, pedido, self.admin)

    def test_duas_aprovacoes_nao_executam_automaticamente(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo)
        self.obra.refresh_from_db(); self.assertEqual(self.obra.status, 'publicado')
        caso = self.executar(self.caso, pedido)
        self.obra.refresh_from_db(); pedido.refresh_from_db()
        self.assertEqual(self.obra.status, 'removido'); self.assertIsNotNone(self.obra.removido_definitivamente_em)
        self.assertTrue(self.obra.pdf); self.assertEqual(pedido.estado, 'executado'); self.assertEqual(caso.retorno_estado, 'pendente')

    def test_pedido_nao_pode_ser_trocado_de_caso(self):
        pedido = self.pedido(self.caso); outro = self.triagem(self.novo())
        with self.assertRaises(ValidationError):
            self.aprovar(outro, pedido, self.admin)
        self.assertFalse(pedido.aprovacoes.exists())

    def test_todas_as_causas_impeditivas_bloqueiam_aprovacao(self):
        pedido = self.pedido(self.caso)
        for causa in ('retencao', 'incidente', 'ordem_autoridade', 'preservacao'):
            hold = ImpedimentoModeracao.objects.create(recurso=self.obra._meta.label, recurso_id=self.obra.pk, causa=causa, referencia='CAUSA-SINTETICA')
            with self.assertRaises(m.ConflitoModeracao):
                self.aprovar(self.caso, pedido, self.admin)
            hold.liberada_em = timezone.now(); hold.save()

    def test_preservacao_storage_g5_bloqueia(self):
        pedido = self.pedido(self.caso)
        PreservacaoDados.objects.create(destino='storage', recurso=self.obra._meta.label, recurso_ref=f'{self.obra.pk}:pdf', motivo_codigo='incidente', revisar_em=timezone.now() + timedelta(days=90))
        with self.assertRaises(m.ConflitoModeracao):
            self.aprovar(self.caso, pedido, self.admin)

    def test_trava_surgida_apos_aprovacoes_impede_execucao(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo)
        ImpedimentoModeracao.objects.create(recurso=self.obra._meta.label, recurso_id=self.obra.pk, causa='incidente', referencia='NOVO-INCIDENTE')
        with self.assertRaises(m.ConflitoModeracao):
            self.executar(self.caso, pedido)
        self.obra.refresh_from_db(); self.assertEqual(self.obra.status, 'publicado')

    def test_alvo_alterado_invalida_aprovacoes(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo)
        self.obra.status = 'suspenso'; self.obra.save()
        with self.assertRaises(m.ConflitoModeracao):
            self.executar(self.caso, pedido)

    def test_bytes_trocados_no_mesmo_caminho_invalidam_aprovacoes(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo)
        with self.obra.pdf.storage.open(self.obra.pdf.name, 'wb') as arquivo:
            arquivo.write(b'%PDF-1.4 bytes sinteticos alterados')
        with self.assertRaises(m.ConflitoModeracao):
            self.executar(self.caso, pedido)
        self.obra.refresh_from_db(); self.assertIsNone(self.obra.removido_definitivamente_em)

    def test_arquivo_indisponivel_impede_pedido(self):
        self.obra.pdf.storage.delete(self.obra.pdf.name)
        with self.assertRaises(m.ConflitoModeracao):
            self.pedido(self.caso)
        self.assertFalse(PedidoConselho.objects.exists())

    def test_aprovacao_expirada_ou_membro_revogado_nao_executa(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo)
        AprovacaoConselho.objects.filter(pedido=pedido, aprovador=self.segundo).update(criada_em=timezone.now() - timedelta(minutes=16))
        with self.assertRaises(m.ConflitoModeracao):
            self.executar(self.caso, pedido)

    def test_cancelar_pedido_libera_nova_preparacao(self):
        pedido = self.pedido(self.caso)
        self.operar(self.caso, 'conselho_cancelar', pedido=pedido.protocolo, motivo='Cancelamento sintético motivado para nova conferência.', senha_atual='sintetica')
        novo = self.pedido(self.caso); self.assertNotEqual(pedido.pk, novo.pk)

    def test_restauracao_ordinaria_nao_contorna_remocao_definitiva(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo); self.executar(self.caso, pedido)
        with self.assertRaises(ConflitoPublicacao):
            restaurar_obra(self.admin, self.obra.pk, 'Tentativa sintética de restauração ordinária.')

    def test_restauracao_excepcional_passa_por_dois_e_gates_editoriais(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo); self.executar(self.caso, pedido)
        self.caso.refresh_from_db()
        pedido = self.pedido(self.caso, 'restaurar'); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo)
        self.executar(self.caso, pedido); self.obra.refresh_from_db(); self.assertEqual(self.obra.status, 'publicado')

    def test_auditoria_falha_reverte_execucao_e_marker(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo)
        with patch('usuarios.moderacao._evento', side_effect=RuntimeError('falha sintética')):
            with self.assertRaises(RuntimeError):
                self.executar(self.caso, pedido)
        self.obra.refresh_from_db(); pedido.refresh_from_db()
        self.assertIsNone(self.obra.removido_definitivamente_em); self.assertEqual(pedido.estado, 'pendente')

    def test_remocao_comunidade_e_reversao_com_conselho(self):
        com = Comunidade.objects.create(nome='Comunidade sintética', criador=self.user)
        caso = self.triagem(self.novo(), alvo_tipo='comunidade', alvo_id=com.pk)
        pedido = self.pedido(caso); self.aprovar(caso, pedido, self.admin); self.aprovar(caso, pedido, self.segundo); self.executar(caso, pedido)
        com.refresh_from_db(); self.assertTrue(com.em_manutencao); self.assertIsNotNone(com.removida_definitivamente_em)

    def test_conta_privilegiada_nunca_e_encerrada_pelo_conselho(self):
        caso = self.triagem(self.novo(), alvo_tipo='conta', alvo_id=self.segundo.pk)
        pedido = self.pedido(caso)
        with self.assertRaises(PermissionDenied):
            self.aprovar(caso, pedido, self.admin)

    def test_conta_comum_reutiliza_encerramento_g5_sem_purga_fisica(self):
        caso = self.triagem(self.novo(), alvo_tipo='conta', alvo_id=self.user.pk)
        pedido = self.pedido(caso); self.aprovar(caso, pedido, self.admin); self.aprovar(caso, pedido, self.segundo); self.executar(caso, pedido)
        self.user.refresh_from_db(); self.assertFalse(self.user.is_active)
        self.assertTrue(self.user.encerramento.destinos.exists()); pedido.refresh_from_db(); self.assertTrue(pedido.resultado_ref)

    def test_rls_g3_habilitado_sem_policy_para_data_api(self):
        tabelas = ['usuarios_casomoderacao', 'usuarios_eventomoderacao', 'usuarios_pedidoconselho']
        with connection.cursor() as cursor:
            cursor.execute('SELECT relname, relrowsecurity FROM pg_class WHERE relname = ANY(%s)', [tabelas])
            self.assertEqual(dict(cursor.fetchall()), {t: True for t in tabelas})
            cursor.execute("SELECT tablename FROM pg_policies WHERE tablename = ANY(%s) AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['authenticated']::name[])", [tabelas])
            self.assertEqual(cursor.fetchall(), [])

    def test_marca_definitiva_bloqueia_pdf_tambem_para_curadoria(self):
        from biblioteca.services import verificar_acesso_obra
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo); self.executar(self.caso, pedido)
        self.obra.refresh_from_db()
        self.assertFalse(verificar_acesso_obra(self.admin, self.obra).pode_ler)

    def test_remocao_definitiva_nao_se_reverte_pelo_toggle_comunidade(self):
        com = Comunidade.objects.create(nome='Oficial sintética', criada_por_sistema=True, criador=self.user)
        caso = self.triagem(self.novo(), alvo_tipo='comunidade', alvo_id=com.pk)
        pedido = self.pedido(caso); self.aprovar(caso, pedido, self.admin); self.aprovar(caso, pedido, self.segundo); self.executar(caso, pedido)
        r = self.api.post(f'/api/v1/comunidades/comunidades/{com.pk}/desativar/', {}, format='json')
        self.assertEqual(r.status_code, 403); com.refresh_from_db(); self.assertTrue(com.em_manutencao)

    def test_recurso_transversal_aberto_bloqueia_nova_remocao(self):
        pedido = self.pedido(self.caso); self.aprovar(self.caso, pedido, self.admin); self.aprovar(self.caso, pedido, self.segundo); self.executar(self.caso, pedido)
        self.caso.refresh_from_db()
        m.recorrer_caso(self.user, self.caso.protocolo, {'fundamento': 'Fundamento sintético de recurso sobre remoção definitiva.', 'chave_idempotencia': uuid4()})
        pedido = self.pedido(self.caso)
        with self.assertRaises(m.ConflitoModeracao):
            self.aprovar(self.caso, pedido, self.admin)


class ConcorrenciaModeracaoTests(ModeracaoBase, TransactionTestCase):
    def setUp(self):
        self.preparar()

    def test_envio_concorrente_mesma_chave_produz_um_protocolo(self):
        dados = self.entrada()
        def enviar(_):
            close_old_connections()
            try:
                return m.receber_publica(dados).pk
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            ids = list(pool.map(enviar, range(2)))
        self.assertEqual(len(set(ids)), 1); self.assertEqual(CasoModeracao.objects.count(), 1)

    def test_assumir_concorrente_elege_um_responsavel(self):
        caso = self.novo()
        def assumir(ator_id):
            close_old_connections()
            try:
                m.operar_caso(User.objects.get(pk=ator_id), caso.protocolo, {'acao': 'assumir', 'chave_idempotencia': uuid4()})
                return True
            except m.ConflitoModeracao:
                return False
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            resultados = list(pool.map(assumir, (self.admin.pk, self.segundo.pk)))
        self.assertEqual(sorted(resultados), [False, True])
