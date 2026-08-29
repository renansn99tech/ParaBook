from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.staticfiles import finders
from rest_framework.test import APIClient

from biblioteca.models import Categoria
from biblioteca.models import Livro, Biblioteca
from biblioteca.models import EventoLeitura, SolicitacaoPublicacao
from biblioteca.api.serializers import SolicitacaoPublicacaoSerializer
from usuarios.models import Usuario
import uuid


class ListaAutoresViewTests(TestCase):
    def test_lista_autores_nao_gera_nameerror(self):
        # Regressao: Usuario nao era importado em biblioteca/views.py
        response = self.client.get(reverse('lista_autores'))
        self.assertEqual(response.status_code, 200)

    def test_css_base_do_template_e_descoberto_pelos_finders(self):
        # O arquivo-fonte vive em STATICFILES_DIRS. staticfiles_storage.exists
        # consulta STATIC_ROOT, que só é preenchido após collectstatic e por
        # isso não representa a disponibilidade do asset em desenvolvimento.
        self.assertIsNotNone(finders.find('css/styles.css'))


class SegurancaCatalogoTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome='Teste')

    def test_usuario_comum_nao_pode_escrever_diretamente_no_catalogo(self):
        user = User.objects.create_user(username='leitor', password='x')
        client = APIClient()
        client.force_authenticate(user)
        response = client.post(
            '/api/v1/biblioteca/livros/',
            {'titulo': 'Injetado', 'autor': 'Cliente', 'categoria': self.categoria.pk},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

    def test_rejeita_arquivo_disfarcado_de_pdf(self):
        arquivo = SimpleUploadedFile('obra.pdf', b'conteudo executavel', content_type='application/pdf')
        serializer = SolicitacaoPublicacaoSerializer(data={
            'titulo': 'Obra',
            'categoria': self.categoria.pk,
            'pdf': arquivo,
            'cpf_autor': '12345678909',
            'declaracao_autoria': True,
            'aceitou_termos': True,
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('pdf', serializer.errors)

    def test_consultar_lixeira_nao_exclui_livro(self):
        admin = User.objects.create_superuser(username='admin-lixeira', password='x')
        livro = Livro.objects.create(
            titulo='Preservado', autor='Autor', categoria=self.categoria, status='removido'
        )
        client = APIClient()
        client.force_authenticate(admin)
        response = client.get('/api/v1/dashboard/lixeira/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Livro.objects.filter(pk=livro.pk).exists())


class ResenhaIdentidadeAdministrativaTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome='Identidade em resenha')
        self.livro = Livro.objects.create(
            titulo='Livro avaliado', autor='Autoria', categoria=self.categoria, status='publicado',
        )
        self.leitor = User.objects.create_user(username='resenha-leitor', password='x')
        Usuario.objects.create(user_auth=self.leitor, nome='Leitor', tipo='leitor')
        self.admin = User.objects.create_user(
            username='resenha-admin-real', password='x', is_staff=True,
        )
        Usuario.objects.create(user_auth=self.admin, nome='Admin de Resenha', tipo='admin')
        Biblioteca.objects.create(
            user=self.admin,
            livro=self.livro,
            status='lido',
            nota=5,
            resenha='Avaliação institucional.',
        )
        self.client = APIClient()
        self.url = f'/api/v1/biblioteca/livros/{self.livro.id}/resenhas/'

    def test_leitor_ve_resenha_administrativa_como_admin_generico(self):
        self.client.force_authenticate(self.leitor)
        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data[0]['usuario_nome'], 'admin')
        self.assertFalse(resposta.data[0]['usuario_perfil_clicavel'])
        self.assertIsNone(resposta.data[0]['usuario_foto'])

    def test_admin_ve_identificador_real_na_resenha(self):
        self.client.force_authenticate(self.admin)
        resposta = self.client.get(self.url)

        self.assertEqual(resposta.data[0]['usuario_nome'], self.admin.username)
        self.assertTrue(resposta.data[0]['usuario_perfil_clicavel'])


class ProgressoLeituraTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='progresso', password='x')
        self.categoria = Categoria.objects.create(nome='Progresso')
        self.livro = Livro.objects.create(
            titulo='Livro Longo', autor='Autora', categoria=self.categoria, paginas=120,
        )
        self.item = Biblioteca.objects.create(user=self.user, livro=self.livro, status='lendo')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_pagina_atual_e_conclusao_sao_persistidas(self):
        url = f'/api/v1/biblioteca/estante/{self.item.pk}/'
        resposta = self.client.patch(url, {'pagina_atual': 57}, format='json')
        self.item.refresh_from_db()
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(self.item.pagina_atual, 57)
        self.assertIsNotNone(self.item.ultima_leitura_em)

        self.client.patch(url, {'status': 'lido'}, format='json')
        self.item.refresh_from_db()
        self.assertIsNotNone(self.item.data_conclusao)

    def test_serializers_expoem_disponibilidade_do_pdf_e_progresso(self):
        detalhe = self.client.get(f'/api/v1/biblioteca/livros/{self.livro.pk}/')
        estante = self.client.get('/api/v1/biblioteca/estante/')

        self.assertEqual(detalhe.status_code, 200)
        self.assertFalse(detalhe.data['pdf_disponivel'])
        self.assertEqual(estante.status_code, 200)
        self.assertEqual(estante.data[0]['livro_paginas'], 120)
        self.assertEqual(estante.data[0]['pagina_atual'], 0)

    def test_pagina_nao_pode_exceder_total(self):
        resposta = self.client.patch(
            f'/api/v1/biblioteca/estante/{self.item.pk}/',
            {'pagina_atual': 121},
            format='json',
        )
        self.assertEqual(resposta.status_code, 400)

    def test_item_pode_ser_removido_da_estante(self):
        resposta = self.client.delete(
            f'/api/v1/biblioteca/estante/{self.item.pk}/'
        )

        self.assertEqual(resposta.status_code, 204)
        self.assertFalse(Biblioteca.objects.filter(pk=self.item.pk).exists())

    def test_avaliacao_registra_e_remove_a_data_da_ultima_avaliacao(self):
        url = f'/api/v1/biblioteca/estante/{self.item.pk}/'

        resposta = self.client.patch(url, {'nota': 5}, format='json')
        self.item.refresh_from_db()

        self.assertEqual(resposta.status_code, 200)
        self.assertIsNotNone(self.item.avaliada_em)

        resposta = self.client.patch(url, {'nota': None, 'resenha': ''}, format='json')
        self.item.refresh_from_db()

        self.assertEqual(resposta.status_code, 200)
        self.assertIsNone(self.item.avaliada_em)


class PainelAutorAPITests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome='Painel do Autor')
        self.autor_a = User.objects.create_user(username='autora-a', password='x')
        self.autor_b = User.objects.create_user(username='autor-b', password='x')
        self.leitor = User.objects.create_user(username='leitora', password='x')
        Usuario.objects.create(user_auth=self.autor_a, nome='Autora A', tipo='autor')
        Usuario.objects.create(user_auth=self.autor_b, nome='Autor B', tipo='autor')
        Usuario.objects.create(user_auth=self.leitor, nome='Leitora', tipo='leitor')

        self.livro_a = Livro.objects.create(
            titulo='Obra da Autora A', autor='Autora A', categoria=self.categoria,
            paginas=200, origem='autor_independente', status='publicado',
        )
        self.livro_b = Livro.objects.create(
            titulo='Obra do Autor B', autor='Autor B', categoria=self.categoria,
            paginas=100, origem='autor_independente', status='publicado',
        )
        SolicitacaoPublicacao.objects.create(usuario=self.autor_a, livro=self.livro_a, status='aprovado')
        SolicitacaoPublicacao.objects.create(usuario=self.autor_b, livro=self.livro_b, status='aprovado')
        self.item_a = Biblioteca.objects.create(
            user=self.leitor, livro=self.livro_a, status='lendo', pagina_atual=50,
            favorito=True,
        )
        self.item_b = Biblioteca.objects.create(
            user=self.leitor, livro=self.livro_b, status='lendo', pagina_atual=10,
        )
        EventoLeitura.objects.create(
            livro=self.livro_a, usuario=self.leitor, sessao_id=uuid.uuid4(),
            pagina=50, percentual=25, duracao_segundos=90,
        )
        EventoLeitura.objects.create(
            livro=self.livro_b, usuario=self.leitor, sessao_id=uuid.uuid4(),
            pagina=10, percentual=10, duracao_segundos=30,
        )

    def test_resumo_limita_obras_e_metricas_ao_autor_autenticado(self):
        client = APIClient()
        client.force_authenticate(self.autor_a)
        resposta = client.get('/api/v1/biblioteca/autor/analytics/resumo/?periodo=30')

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['total_publicadas'], 1)
        self.assertEqual(resposta.data['kpis']['leituras']['valor'], 1)
        self.assertEqual([obra['id'] for obra in resposta.data['obras']], [self.livro_a.id])
        self.assertNotContains(resposta, 'Obra do Autor B')

    def test_leitor_nao_acessa_painel_de_autor(self):
        client = APIClient()
        client.force_authenticate(self.leitor)
        resposta = client.get('/api/v1/biblioteca/autor/analytics/resumo/')
        self.assertEqual(resposta.status_code, 403)

    def test_evento_calcula_percentual_no_backend(self):
        client = APIClient()
        client.force_authenticate(self.leitor)
        resposta = client.post('/api/v1/biblioteca/leitura/eventos/', {
            'livro': self.livro_a.id,
            'pagina': 80,
            'sessao_id': str(uuid.uuid4()),
            'duracao_segundos': 45,
            'percentual': 99,
        }, format='json')

        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data['percentual'], 40)

    def test_exportacao_de_obra_alheia_retorna_404_sem_vazar_existencia(self):
        client = APIClient()
        client.force_authenticate(self.autor_a)
        resposta = client.get(
            f'/api/v1/biblioteca/autor/analytics/exportar/?periodo=30&obra={self.livro_b.id}'
        )
        self.assertEqual(resposta.status_code, 404)

    def test_csv_usa_bom_separador_pt_br_e_so_dados_do_autor(self):
        client = APIClient()
        client.force_authenticate(self.autor_a)
        resposta = client.get('/api/v1/biblioteca/autor/analytics/exportar/?periodo=30')
        conteudo = resposta.content.decode('utf-8-sig')

        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(resposta.content.startswith(b'\xef\xbb\xbf'))
        self.assertIn('data;obra;leituras;leitores_unicos;favoritos;conclusoes', conteudo)
        self.assertIn('Obra da Autora A', conteudo)
        self.assertNotIn('Obra do Autor B', conteudo)
