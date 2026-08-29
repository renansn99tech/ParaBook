from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from biblioteca.models import Categoria, Denuncia, Livro, SolicitacaoPublicacao
from comunidades.models import Comunidade, DenunciaComunidade
from notificacoes.models import Notificacao
from usuarios.models import Usuario, AuditoriaAcao
from dashboard.models import FeatureFlag
from perfis.models import (
    FRASE_STATUS_PADRAO_AUTOR,
    FRASE_STATUS_PADRAO_LEITOR,
    Perfil,
)


def criar_admin(username):
    admin = User.objects.create_user(username=username, password='x', is_staff=True)
    Usuario.objects.create(user_auth=admin, nome=username, tipo='admin')
    return admin


class DashboardLixeiraAPIViewTests(TestCase):
    def setUp(self):
        self.admin = criar_admin('admin-dash')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_get_lixeira_nao_gera_nameerror(self):
        # Regressao: timezone/timedelta nao eram importados em dashboard/api/views.py
        response = self.client.get(reverse('api-dashboard-lixeira'))
        self.assertEqual(response.status_code, 200)


class DashboardEstatisticasAPIViewTests(TestCase):
    def setUp(self):
        self.admin = criar_admin('admin-stats')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_retorna_metricas_do_painel_de_perfil_admin(self):
        response = self.client.get(reverse('api-dashboard-estatisticas'))

        self.assertEqual(response.status_code, 200)
        self.assertIn('obras_publicadas', response.data['estatisticas'])
        self.assertIn('aprovacoes_pendentes', response.data['estatisticas'])
        self.assertIn('denuncias_abertas', response.data['estatisticas'])
        self.assertIn('novos_usuarios_hoje', response.data['estatisticas'])

    def test_retorna_pendencias_turno_e_atividade_sem_requisicoes_por_aba(self):
        candidato = User.objects.create_user(username='candidato-turno', password='x')
        Usuario.objects.create(user_auth=candidato, nome='Candidato', tipo='aguardando_aprovacao')
        categoria = Categoria.objects.create(nome='Teste dashboard')
        removido = Livro.objects.create(
            titulo='Livro removido', autor='Autor', categoria=categoria, status='removido',
        )
        Denuncia.objects.create(
            livro=removido,
            usuario=candidato,
            motivo='Registro arquivado',
            arquivada=True,
        )
        comunidade = Comunidade.objects.create(nome='Comunidade oficial', descricao='Teste', criada_por_sistema=True)
        DenunciaComunidade.objects.create(comunidade=comunidade, usuario=candidato, motivo='Revisar comunidade')
        AuditoriaAcao.objects.create(
            ator=self.admin,
            acao='moderacao.autor.aprovar',
            recurso='Usuario',
            recurso_id='1',
        )

        response = self.client.get(reverse('api-dashboard-estatisticas'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['pendencias']['aprovacoes'], 1)
        self.assertEqual(response.data['pendencias']['denuncias'], 1)
        self.assertEqual(response.data['pendencias']['lixeira'], 2)
        self.assertEqual(response.data['estatisticas']['comunidades_oficiais'], 1)
        self.assertTrue(response.data['turno']['itens'])
        self.assertEqual(response.data['turno']['ultima_decisao']['acao'], 'moderacao.autor.aprovar')
        self.assertTrue(response.data['atividade'])

    def test_lista_de_usuarios_entrega_campos_para_busca_e_filtro(self):
        response = self.client.get(reverse('api-dashboard-usuarios'))

        self.assertEqual(response.status_code, 200)
        admin = next(item for item in response.data if item['username'] == self.admin.username)
        self.assertEqual(admin['tipo'], 'admin')
        self.assertIn('nome', admin)
        self.assertIn('email', admin)
        self.assertIn('is_active', admin)
        self.assertIn('last_login', admin)
        self.assertIn('date_joined', admin)

    def test_leitor_nao_acessa_metricas_administrativas(self):
        leitor = User.objects.create_user(username='leitor-sem-staff', password='x')
        self.client.force_authenticate(user=leitor)

        response = self.client.get(reverse('api-dashboard-estatisticas'))

        self.assertEqual(response.status_code, 403)

    def test_staff_sem_papel_admin_nao_acessa_metricas(self):
        staff_leitor = User.objects.create_user(username='staff-leitor', password='x', is_staff=True)
        Usuario.objects.create(user_auth=staff_leitor, nome='Staff leitor', tipo='leitor')
        self.client.force_authenticate(user=staff_leitor)

        response = self.client.get(reverse('api-dashboard-estatisticas'))

        self.assertEqual(response.status_code, 403)


class DashboardModeracaoAPIViewTests(TestCase):
    def setUp(self):
        self.admin = criar_admin('admin-moderacao')
        self.autor = User.objects.create_user(username='autor-pendente', password='x')
        self.perfil_autor = Perfil.objects.create(
            usuario=self.autor,
            descricao_perfil=FRASE_STATUS_PADRAO_LEITOR,
        )
        self.usuario = Usuario.objects.create(
            user_auth=self.autor,
            nome='Autor Pendente',
            tipo='aguardando_aprovacao',
            perfil=self.perfil_autor,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_aprova_autor_e_registra_auditoria(self):
        response = self.client.post(
            reverse('api-dashboard-moderacao', args=['autor', self.usuario.pk]),
            {'acao': 'aprovar'},
            format='json',
        )
        self.usuario.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.usuario.tipo, 'autor')
        self.perfil_autor.refresh_from_db()
        self.assertEqual(self.perfil_autor.descricao_perfil, FRASE_STATUS_PADRAO_AUTOR)
        self.assertTrue(AuditoriaAcao.objects.filter(acao='moderacao.autor.aprovar').exists())

    def test_aprovacao_preserva_status_personalizado_do_autor(self):
        self.perfil_autor.descricao_perfil = 'Escrevo fantasia amazônica.'
        self.perfil_autor.save(update_fields=['descricao_perfil'])

        response = self.client.post(
            reverse('api-dashboard-moderacao', args=['autor', self.usuario.pk]),
            {'acao': 'aprovar'},
            format='json',
        )

        self.perfil_autor.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.perfil_autor.descricao_perfil, 'Escrevo fantasia amazônica.')

    def test_decisao_duplicada_e_barrada(self):
        url = reverse('api-dashboard-moderacao', args=['autor', self.usuario.pk])
        self.assertEqual(self.client.post(url, {'acao': 'recusar'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(url, {'acao': 'aprovar'}, format='json').status_code, 409)

    def test_leitor_nao_pode_moderar(self):
        self.client.force_authenticate(self.autor)
        response = self.client.post(
            reverse('api-dashboard-moderacao', args=['autor', self.usuario.pk]),
            {'acao': 'aprovar'},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

    def test_recusa_publicacao_envia_motivo_ao_autor(self):
        categoria = Categoria.objects.create(nome='Publicação moderada')
        livro = Livro.objects.create(titulo='Obra em revisão', autor='Autor', categoria=categoria, status='pendente')
        solicitacao = SolicitacaoPublicacao.objects.create(usuario=self.autor, livro=livro)

        response = self.client.post(
            reverse('api-dashboard-moderacao', args=['publicacao', solicitacao.pk]),
            {'acao': 'recusar', 'observacao': 'A capa precisa identificar corretamente a obra.'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        notificacao = Notificacao.objects.get(usuario=self.autor, titulo='Publicação analisada')
        self.assertIn('A capa precisa identificar corretamente a obra.', notificacao.mensagem)

    def test_arquiva_falso_positivo_de_comunidade_e_atualiza_resumo(self):
        comunidade = Comunidade.objects.create(
            nome='Comunidade denunciada', descricao='Em análise.', total_denuncias=1,
        )
        denuncia = DenunciaComunidade.objects.create(
            comunidade=comunidade, usuario=self.autor, motivo='Possível falso positivo',
        )

        decisao = self.client.post(
            reverse('api-dashboard-moderacao', args=['comunidade', denuncia.pk]),
            {'acao': 'recusar'},
            format='json',
        )
        painel = self.client.get(
            reverse('api-dashboard-denuncias-comunidade', args=[comunidade.pk]),
        )

        comunidade.refresh_from_db()
        denuncia.refresh_from_db()
        self.assertEqual(decisao.status_code, 200)
        self.assertEqual(denuncia.status, 'arquivada')
        self.assertEqual(comunidade.total_denuncias, 0)
        self.assertEqual(painel.data['resumo']['pendentes'], 0)
        self.assertEqual(painel.data['resumo']['arquivadas'], 1)
        self.assertEqual(painel.data['historico'][0]['id'], denuncia.pk)


class DashboardDenunciasComunidadeAPIViewTests(TestCase):
    def setUp(self):
        self.admin = criar_admin('admin-painel-comunidade')
        self.leitor = User.objects.create_user(username='denunciante-painel', password='x')
        Usuario.objects.create(user_auth=self.leitor, nome='Denunciante', tipo='leitor')
        self.comunidade = Comunidade.objects.create(
            nome='Comunidade em análise', descricao='Contexto do painel.', total_denuncias=2,
        )
        self.outra = Comunidade.objects.create(nome='Outra comunidade', descricao='Outro contexto.')
        self.pendente = DenunciaComunidade.objects.create(
            comunidade=self.comunidade, usuario=self.leitor, motivo='Conteúdo inadequado',
        )
        DenunciaComunidade.objects.create(
            comunidade=self.comunidade, usuario=self.leitor, motivo='Já analisada', status='arquivada',
        )
        DenunciaComunidade.objects.create(
            comunidade=self.outra, usuario=self.leitor, motivo='Não deve aparecer',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_retorna_resumo_fila_e_historico_apenas_da_comunidade(self):
        resposta = self.client.get(
            reverse('api-dashboard-denuncias-comunidade', args=[self.comunidade.pk]),
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['comunidade']['id'], self.comunidade.pk)
        self.assertEqual(resposta.data['resumo'], {
            'pendentes': 1, 'acolhidas': 0, 'arquivadas': 1, 'total': 2,
        })
        self.assertEqual([item['id'] for item in resposta.data['denuncias']], [self.pendente.pk])
        self.assertEqual(len(resposta.data['historico']), 1)

    def test_leitor_nao_acessa_painel_especifico(self):
        self.client.force_authenticate(self.leitor)

        resposta = self.client.get(
            reverse('api-dashboard-denuncias-comunidade', args=[self.comunidade.pk]),
        )

        self.assertEqual(resposta.status_code, 403)


class DashboardAdministracaoAvancadaAPIViewTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = criar_admin('admin-avancado')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_modelos_admin_lista_apenas_changelists_registrados(self):
        response = self.client.get(reverse('api-dashboard-modelos-admin'))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['django_admin_url'].endswith('/admin/'))
        self.assertTrue(response.data['modelos'])
        self.assertNotIn('biblioteca.Livro', {item['modelo'] for item in response.data['modelos']})
        for item in response.data['modelos']:
            self.assertIn('/admin/', item['url'])
            self.assertIsInstance(item['contagem'], int)

    def test_atalho_django_admin_registra_auditoria(self):
        response = self.client.post(reverse('api-dashboard-django-admin-acesso'), {}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditoriaAcao.objects.filter(
                ator=self.admin,
                acao='django_admin.atalho_aberto',
            ).exists()
        )

    def test_auditoria_avancada_filtra_e_pagina_sem_escrita(self):
        AuditoriaAcao.objects.create(
            ator=self.admin,
            acao='conta.excluida',
            recurso='User',
            recurso_id='10',
        )
        AuditoriaAcao.objects.create(
            ator=self.admin,
            acao='moderacao.autor.aprovar',
            recurso='Usuario',
            recurso_id='20',
            metadados={'observacao_informada': False},
        )

        response = self.client.get(
            reverse('api-dashboard-auditoria'),
            {'formato': 'avancado', 'tipo': 'moderacao'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['filtro'], 'moderacao')
        self.assertEqual(response.data['contagens']['tudo'], 2)
        self.assertEqual(response.data['contagens']['moderacao'], 1)
        self.assertEqual(len(response.data['resultados']), 1)
        self.assertEqual(response.data['resultados'][0]['tipo'], 'moderacao')

    def test_exportacao_csv_e_protegida_para_nao_admin(self):
        AuditoriaAcao.objects.create(
            ator=self.admin,
            acao='=FORMULA',
            recurso='FeatureFlag',
        )
        response = self.client.get(
            reverse('api-dashboard-auditoria'),
            {'formato': 'csv'},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv; charset=utf-8')
        self.assertIn("'=FORMULA", response.content.decode('utf-8-sig'))

        leitor = User.objects.create_user(username='leitor-auditoria', password='x')
        Usuario.objects.create(user_auth=leitor, nome='Leitor', tipo='leitor')
        self.client.force_authenticate(leitor)
        negado = self.client.get(
            reverse('api-dashboard-auditoria'),
            {'formato': 'avancado'},
        )
        self.assertEqual(negado.status_code, 403)

    def test_flags_em_breve_ficam_desligadas_e_nao_podem_ser_alteradas(self):
        response = self.client.get(reverse('api-dashboard-feature-flags'))

        self.assertEqual(response.status_code, 200)
        flags = {item['chave']: item for item in response.data}
        self.assertFalse(flags['autenticacao_2fa']['disponivel'])
        self.assertFalse(flags['autenticacao_2fa']['habilitada'])
        self.assertFalse(flags['analytics_autor']['disponivel'])
        self.assertFalse(flags['analytics_autor']['habilitada'])

        alteracao = self.client.patch(
            reverse('api-dashboard-feature-flags'),
            {'chave': 'autenticacao_2fa', 'habilitada': True},
            format='json',
        )

        self.assertEqual(alteracao.status_code, 409)
        self.assertIn('indisponível', alteracao.data['detail'])
        self.assertFalse(FeatureFlag.objects.get(chave='autenticacao_2fa').habilitada)

    def test_banner_pode_ser_alternado_e_exposto_sem_autenticacao(self):
        alteracao = self.client.patch(
            reverse('api-dashboard-feature-flags'),
            {'chave': 'banner_anuncios', 'habilitada': True},
            format='json',
        )
        self.assertEqual(alteracao.status_code, 200)
        self.assertTrue(alteracao.data['habilitada'])
        self.assertTrue(
            AuditoriaAcao.objects.filter(
                ator=self.admin,
                acao='feature_flag.alterada',
                metadados__chave='banner_anuncios',
            ).exists()
        )

        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('api-dashboard-feature-flags-publicas'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'banner_anuncios': True})
