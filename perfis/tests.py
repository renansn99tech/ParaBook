import tempfile
from datetime import timedelta
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from assinaturas.models import Assinatura, Plano
from biblioteca.models import Biblioteca, Categoria, Livro, SolicitacaoPublicacao
from comunidades.models import Comunidade, PostagemComunidade, RespostaPostagem
from gamificacao.models import Conquista, ConquistaUsuario
from notificacoes.models import Notificacao
from perfis.models import Perfil
from usuarios.models import SessaoDispositivo, Usuario


def _imagem_png():
    """Gera um PNG 1x1 válido para o ImageField aceitar (Pillow valida o conteúdo)."""
    buffer = BytesIO()
    Image.new('RGB', (1, 1), '#8B5CF6').save(buffer, format='PNG')
    buffer.seek(0)
    return SimpleUploadedFile('avatar.png', buffer.read(), content_type='image/png')


class HistoricoPerfilAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='historico-user', password='x')
        self.categoria = Categoria.objects.create(nome='Memórias')
        livro = Livro.objects.create(
            titulo='Livro da Jornada',
            autor='Autora da Jornada',
            categoria=self.categoria,
        )
        Biblioteca.objects.create(
            user=self.user,
            livro=livro,
            status='lido',
            nota=5,
            resenha='Uma leitura marcante.',
            data_conclusao=timezone.now(),
            avaliada_em=timezone.now(),
        )
        Notificacao.objects.create(
            usuario=self.user,
            titulo='Nova resposta na comunidade',
            mensagem='Uma pessoa respondeu à sua publicação.',
            tipo='COMUNIDADE',
            link='/comunidade/1/conteudo',
        )
        conquista = Conquista.objects.create(
            slug='jornada-historico',
            nome='Primeira jornada',
            descricao='Concluiu uma etapa da jornada.',
            pontos_recompensa=80,
        )
        ConquistaUsuario.objects.create(user=self.user, conquista=conquista)
        self.client = APIClient()
        self.url = reverse('api-historico-perfil')

    def test_requer_autenticacao(self):
        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 401)

    def test_reune_livros_avaliacoes_respostas_e_conquistas(self):
        self.client.force_authenticate(user=self.user)

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['total'], 4)
        self.assertEqual(len(resposta.data['recentes']['livros']), 1)
        self.assertEqual(len(resposta.data['recentes']['avaliacoes']), 1)
        self.assertEqual(
            {evento['tipo'] for evento in resposta.data['eventos']},
            {'livro', 'avaliacao', 'comunidade', 'conquista'},
        )
        evento_comunidade = next(
            evento for evento in resposta.data['eventos']
            if evento['tipo'] == 'comunidade'
        )
        self.assertEqual(evento_comunidade['link'], '/comunidade/1/conteudo')

    def test_resumos_laterais_trazem_no_maximo_dez_itens_por_tipo(self):
        for indice in range(11):
            livro = Livro.objects.create(
                titulo=f'Livro recente {indice}',
                autor='Autora da Jornada',
                categoria=self.categoria,
            )
            Biblioteca.objects.create(
                user=self.user,
                livro=livro,
                status='lido',
                nota=4,
            )
        self.client.force_authenticate(user=self.user)

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data['recentes']['livros']), 10)
        self.assertEqual(len(resposta.data['recentes']['avaliacoes']), 10)

    def test_descarta_link_externo_de_notificacao(self):
        Notificacao.objects.create(
            usuario=self.user,
            titulo='Link inseguro',
            mensagem='Não deve sair da aplicação.',
            tipo='COMUNIDADE',
            link='https://exemplo.test/phishing',
        )
        self.client.force_authenticate(user=self.user)

        resposta = self.client.get(self.url)
        evento = next(
            item for item in resposta.data['eventos']
            if item['titulo'] == 'Link inseguro'
        )

        self.assertEqual(evento['link'], '/notificacoes')


class ResumoLeituraAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='resumo-leitor', password='x')
        self.outro = User.objects.create_user(username='resumo-colega', password='x')
        fantasia = Categoria.objects.create(nome='Fantasia do resumo')
        ensaio = Categoria.objects.create(nome='Ensaio do resumo')
        atual = Livro.objects.create(
            titulo='Leitura em andamento', autor='Autora Um', categoria=fantasia, paginas=200,
        )
        avaliado = Livro.objects.create(
            titulo='Leitura avaliada', autor='Autor Dois', categoria=fantasia, paginas=100,
        )
        outro_genero = Livro.objects.create(
            titulo='Outro gênero', autor='Autora Três', categoria=ensaio, paginas=120,
        )
        Biblioteca.objects.create(
            user=self.user, livro=atual, status='lendo', pagina_atual=50,
            ultima_leitura_em=timezone.now(),
        )
        Biblioteca.objects.create(
            user=self.user, livro=avaliado, status='lido', nota=5,
            data_conclusao=timezone.now(), avaliada_em=timezone.now(),
        )
        Biblioteca.objects.create(
            user=self.user, livro=outro_genero, status='quero_ler', resenha='Quero explorar.',
        )

        comunidade = Comunidade.objects.create(
            nome='Clube do resumo', descricao='Conversas relevantes.', criador=self.user,
        )
        comunidade.membros.add(self.user, self.outro)
        postagem = PostagemComunidade.objects.create(
            comunidade=comunidade, autor=self.user,
            titulo='Uma discussão relevante', conteudo='Texto da discussão.',
        )
        RespostaPostagem.objects.create(
            postagem=postagem, autor=self.outro, conteudo='Primeira resposta externa.',
        )
        RespostaPostagem.objects.create(
            postagem=postagem, autor=self.outro, conteudo='Segunda resposta externa.',
        )
        RespostaPostagem.objects.create(
            postagem=postagem, autor=self.user, conteudo='Complemento do autor.',
        )
        somente_propria = PostagemComunidade.objects.create(
            comunidade=comunidade, autor=self.user,
            titulo='Sem validação externa', conteudo='Ainda sem respostas de terceiros.',
        )
        RespostaPostagem.objects.create(
            postagem=somente_propria, autor=self.user, conteudo='Resposta própria.',
        )

        sessao = SessaoDispositivo.objects.create(
            usuario=self.user,
            refresh_jti='resumo-jti',
            expira_em=timezone.now() + timedelta(days=1),
        )
        SessaoDispositivo.objects.filter(pk=sessao.pk).update(
            criada_em=timezone.now() - timedelta(minutes=40),
            ultima_atividade_em=timezone.now(),
        )
        self.client = APIClient()
        self.url = reverse('api-resumo-leitura')

    def test_requer_autenticacao(self):
        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 401)

    def test_resume_jornada_sem_contar_resposta_do_proprio_autor(self):
        self.client.force_authenticate(user=self.user)

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['leitura_destaque']['titulo'], 'Leitura em andamento')
        self.assertEqual(resposta.data['leitura_destaque']['progresso_percentual'], 25)
        self.assertEqual(resposta.data['metricas']['generos_explorados'], 2)
        self.assertEqual(resposta.data['metricas']['avaliacoes_feitas'], 2)
        self.assertEqual(resposta.data['metricas']['postagens_relevantes'], 1)
        self.assertEqual(resposta.data['metricas']['tempo_medio_sessao_segundos'], 2400)
        self.assertEqual(resposta.data['postagens_relevantes'][0]['respostas'], 2)
        self.assertEqual(resposta.data['postagens_relevantes'][0]['participantes'], 1)
        self.assertNotIn(
            'Sem validação externa',
            {postagem['titulo'] for postagem in resposta.data['postagens_relevantes']},
        )


class AutoresListAPIViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='leitor-teste', password='x')
        autor_auth = User.objects.create_user(username='autor-teste', password='x')
        Usuario.objects.create(user_auth=autor_auth, nome='Autor Teste', tipo='autor')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_get_autores_nao_gera_nameerror(self):
        # Regressao: Livro nao era importado em perfis/api/views.py. So dispara
        # dentro do loop, por isso o setUp precisa de 1 Usuario tipo='autor'.
        response = self.client.get(reverse('api-autores'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)


# Isola os uploads num diretorio temporario para nao sujar o media/ do repo.
@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class FotoPerfilAPITests(TestCase):
    # Contrato que os botoes de foto do Profile.jsx consomem: trocar (upload
    # multipart) e remover (foto=null volta para o avatar padrao).

    def setUp(self):
        self.user = User.objects.create_user(username='foto-user', password='x')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = reverse('api-meu-perfil')

    def test_upload_multipart_define_a_foto(self):
        resposta = self.client.patch(self.url, {'foto': _imagem_png()}, format='multipart')
        self.assertEqual(resposta.status_code, 200)
        perfil = Perfil.objects.get(usuario=self.user)
        self.assertTrue(perfil.foto)

    def test_upload_multipart_define_a_capa(self):
        resposta = self.client.patch(self.url, {'capa': _imagem_png()}, format='multipart')
        self.assertEqual(resposta.status_code, 200)
        perfil = Perfil.objects.get(usuario=self.user)
        self.assertTrue(perfil.capa)

    def test_foto_null_limpa_a_foto(self):
        self.client.patch(self.url, {'foto': _imagem_png()}, format='multipart')
        perfil = Perfil.objects.get(usuario=self.user)
        self.assertTrue(perfil.foto)  # sanidade: havia foto antes de remover

        resposta = self.client.patch(self.url, {'foto': None}, format='json')
        self.assertEqual(resposta.status_code, 200)

        perfil.refresh_from_db()
        self.assertFalse(perfil.foto)


class ContratoPerfilModernizadoTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin-perfil',
            password='x',
            is_staff=True,
        )
        self.perfil = Perfil.objects.create(usuario=self.admin)
        Usuario.objects.create(
            user_auth=self.admin,
            nome='Admin Perfil',
            tipo='admin',
            perfil=self.perfil,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_perfil_autenticado_expoe_data_e_flags_de_autorizacao(self):
        self.admin.email = 'admin-perfil@parabook.test'
        self.admin.save(update_fields=['email'])
        usuario = self.admin.perfil_customizado
        usuario.data_nascimento = '15/06/1995'
        usuario.save(update_fields=['data_nascimento'])

        response = self.client.get(reverse('api-meu-perfil'))

        self.assertEqual(response.status_code, 200)
        self.assertIn('date_joined', response.data)
        self.assertEqual(response.data['email'], 'admin-perfil@parabook.test')
        self.assertEqual(response.data['data_nascimento'], '1995-06-15')
        self.assertIsInstance(response.data['idade'], int)
        self.assertTrue(response.data['is_staff'])
        self.assertFalse(response.data['is_superuser'])

    def test_biografia_aceita_ate_800_caracteres(self):
        url = reverse('api-meu-perfil')

        aceita = self.client.patch(url, {'bio': 'a' * 800}, format='json')
        excede = self.client.patch(url, {'bio': 'a' * 801}, format='json')

        self.assertEqual(aceita.status_code, 200)
        self.assertEqual(excede.status_code, 400)
        self.assertIn('bio', excede.data)

    def test_atualiza_nascimento_e_privacidade_dos_dados_pessoais(self):
        response = self.client.patch(
            reverse('api-meu-perfil'),
            {
                'data_nascimento': '1998-04-21',
                'exibir_idade': False,
                'exibir_data_nascimento': False,
                'exibir_email': False,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data_nascimento'], '1998-04-21')
        self.assertFalse(response.data['exibir_idade'])
        self.assertFalse(response.data['exibir_data_nascimento'])
        self.assertFalse(response.data['exibir_email'])

    def test_rejeita_nascimento_no_futuro(self):
        response = self.client.patch(
            reverse('api-meu-perfil'),
            {'data_nascimento': '2999-01-01'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('data_nascimento', response.data)

    def test_admin_staff_pode_carregar_o_proprio_perfil_completo(self):
        response = self.client.get(reverse('api-perfil-publico', args=[self.admin.username]))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_owner'])

    def test_perfil_administrativo_so_pode_ser_visto_por_outro_admin(self):
        outro_admin = User.objects.create_user(
            username='outro-admin', password='x', is_staff=True,
        )
        outro_perfil = Perfil.objects.create(usuario=outro_admin)
        Usuario.objects.create(
            user_auth=outro_admin,
            nome='Outro Admin',
            tipo='admin',
            perfil=outro_perfil,
        )
        self.client.force_authenticate(user=outro_admin)

        permitido = self.client.get(
            reverse('api-perfil-publico', args=[self.admin.username]),
        )

        self.assertEqual(permitido.status_code, 200)
        self.assertFalse(permitido.data['is_owner'])

        staff_leitor = User.objects.create_user(
            username='staff-leitor-perfil', password='x', is_staff=True,
        )
        staff_perfil = Perfil.objects.create(usuario=staff_leitor)
        Usuario.objects.create(
            user_auth=staff_leitor,
            nome='Staff Leitor',
            tipo='leitor',
            perfil=staff_perfil,
        )
        self.client.force_authenticate(user=staff_leitor)

        negado = self.client.get(
            reverse('api-perfil-publico', args=[self.admin.username]),
        )

        self.assertEqual(negado.status_code, 403)
        self.assertEqual(negado.data['status_block'], 'admin')

    def test_dados_privados_so_sao_expostos_ao_proprio_titular(self):
        self.admin.email = 'segredo@parabook.test'
        self.admin.save(update_fields=['email'])
        usuario = self.admin.perfil_customizado
        usuario.data_nascimento = '1995-06-15'
        usuario.save(update_fields=['data_nascimento'])
        self.perfil.exibir_idade = False
        self.perfil.exibir_data_nascimento = False
        self.perfil.exibir_email = False
        self.perfil.save(update_fields=[
            'exibir_idade', 'exibir_data_nascimento', 'exibir_email',
        ])

        outro_admin = User.objects.create_user(
            username='admin-sem-acesso-aos-dados', password='x', is_staff=True,
        )
        outro_perfil = Perfil.objects.create(usuario=outro_admin)
        Usuario.objects.create(
            user_auth=outro_admin,
            nome='Admin sem acesso aos dados',
            tipo='admin',
            perfil=outro_perfil,
        )
        self.client.force_authenticate(user=outro_admin)

        resposta_terceiro = self.client.get(
            reverse('api-perfil-publico', args=[self.admin.username]),
        )

        self.assertEqual(resposta_terceiro.status_code, 200)
        self.assertEqual(resposta_terceiro.data['dados_pessoais'], {
            'idade': None,
            'data_nascimento': None,
            'email': None,
            'exibir_idade': False,
            'exibir_data_nascimento': False,
            'exibir_email': False,
        })

        self.client.force_authenticate(user=self.admin)
        resposta_titular = self.client.get(
            reverse('api-perfil-publico', args=[self.admin.username]),
        )

        self.assertEqual(resposta_titular.status_code, 200)
        self.assertIsInstance(resposta_titular.data['dados_pessoais']['idade'], int)
        self.assertEqual(
            resposta_titular.data['dados_pessoais']['data_nascimento'],
            '1995-06-15',
        )
        self.assertEqual(
            resposta_titular.data['dados_pessoais']['email'],
            'segredo@parabook.test',
        )


class InteressesPerfilAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='interesses-user', password='x')
        self.perfil = Perfil.objects.create(usuario=self.user)
        self.usuario = Usuario.objects.create(
            user_auth=self.user,
            nome='Leitor de Interesses',
            tipo='leitor',
            perfil=self.perfil,
        )
        fantasia = Categoria.objects.create(nome='Fantasia')
        ensaio = Categoria.objects.create(nome='Ensaio')
        self.favorito = Livro.objects.create(
            titulo='A Escolha do Leitor', autor='Autora Um', categoria=fantasia,
        )
        segundo_fantasia = Livro.objects.create(
            titulo='Outra Fantasia', autor='Autor Dois', categoria=fantasia,
        )
        ensaio_livro = Livro.objects.create(
            titulo='Um Ensaio', autor='Autora Três', categoria=ensaio,
        )
        Biblioteca.objects.create(user=self.user, livro=self.favorito, status='lido', nota=5)
        Biblioteca.objects.create(user=self.user, livro=segundo_fantasia, status='lido', nota=4)
        Biblioteca.objects.create(user=self.user, livro=ensaio_livro, status='quero_ler')

        self.comunidade_ativa = Comunidade.objects.create(nome='Fantasia Ativa')
        self.comunidade_ativa.membros.add(self.user)
        PostagemComunidade.objects.create(
            comunidade=self.comunidade_ativa, autor=self.user,
            titulo='Primeira conversa', conteudo='Conteúdo',
        )
        PostagemComunidade.objects.create(
            comunidade=self.comunidade_ativa, autor=self.user,
            titulo='Segunda conversa', conteudo='Conteúdo',
        )
        comunidade_em_manutencao = Comunidade.objects.create(
            nome='Comunidade indisponível', em_manutencao=True,
        )
        comunidade_em_manutencao.membros.add(self.user)
        PostagemComunidade.objects.create(
            comunidade=comunidade_em_manutencao, autor=self.user,
            titulo='Não deve aparecer', conteudo='Conteúdo',
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = reverse('api-perfil-publico', args=[self.user.username])

    def test_interesses_usam_estante_e_apenas_comunidades_ativas(self):
        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 200)
        interesses = resposta.data['interesses']
        self.assertEqual(interesses['generos'][0], {'nome': 'Fantasia', 'total': 2})
        self.assertEqual(
            interesses['comunidades'],
            [{
                'id': self.comunidade_ativa.id,
                'nome': self.comunidade_ativa.nome,
                'participacoes': 2,
            }],
        )
        self.assertEqual(interesses['recomendacao']['id'], self.favorito.id)
        self.assertEqual(interesses['recomendacao']['tipo'], 'leitor')
        self.assertEqual(interesses['recomendacao']['nota'], 5)

    def test_autor_recebe_obra_propria_publicada_como_recomendacao(self):
        self.usuario.tipo = 'autor'
        self.usuario.save(update_fields=['tipo'])
        SolicitacaoPublicacao.objects.create(
            usuario=self.user,
            livro=self.favorito,
            status='aprovado',
        )

        resposta = self.client.get(self.url)

        recomendacao = resposta.data['interesses']['recomendacao']
        self.assertEqual(recomendacao['id'], self.favorito.id)
        self.assertEqual(recomendacao['tipo'], 'autor')
        self.assertEqual(recomendacao['rotulo'], 'Recomendação do Autor')


class InicioPersonalizadoAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='inicio-user', password='x')
        perfil = Perfil.objects.create(usuario=self.user)
        self.usuario = Usuario.objects.create(
            user_auth=self.user,
            nome='Leitor da Home',
            tipo='leitor',
            perfil=perfil,
        )
        self.fantasia = Categoria.objects.create(nome='Fantasia da Home')
        self.ensaio = Categoria.objects.create(nome='Ensaio da Home')
        livro_estante = Livro.objects.create(
            titulo='Já está na estante', autor='Autora A', categoria=self.fantasia,
        )
        self.recomendado = Livro.objects.create(
            titulo='Fantasia recomendada', autor='Autor B', categoria=self.fantasia,
            avaliacao=4.8,
        )
        Livro.objects.create(
            titulo='Destaque complementar', autor='Autora C', categoria=self.ensaio,
            avaliacao=4.5,
        )
        Biblioteca.objects.create(user=self.user, livro=livro_estante, status='lido')
        self.client = APIClient()
        self.url = reverse('api-inicio-personalizado')

    def test_inicio_exige_autenticacao(self):
        resposta = self.client.get(self.url)

        self.assertIn(resposta.status_code, [401, 403])

    def test_descobertas_excluem_estante_e_explicam_o_criterio(self):
        self.client.force_authenticate(user=self.user)

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['papel'], 'leitor')
        self.assertEqual(resposta.data['descobertas'][0]['id'], self.recomendado.id)
        self.assertNotIn('Já está na estante', [item['titulo'] for item in resposta.data['descobertas']])
        self.assertIn('Fantasia da Home', resposta.data['descobertas'][0]['motivo'])
        self.assertEqual(resposta.data['proxima_acao']['link'], '/comunidades')

    def test_notificacao_de_comunidade_define_a_proxima_acao_com_link_seguro(self):
        Notificacao.objects.create(
            usuario=self.user,
            tipo='COMUNIDADE',
            titulo='Responderam sua postagem',
            mensagem='Uma nova resposta chegou.',
            link='https://destino-externo.test/inseguro',
        )
        self.client.force_authenticate(user=self.user)

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.data['proxima_acao']['titulo'], 'Responderam sua postagem')
        self.assertEqual(resposta.data['proxima_acao']['link'], '/notificacoes')

    def test_cta_respeita_os_estados_de_autoria_e_administracao(self):
        self.client.force_authenticate(user=self.user)

        self.usuario.tipo = 'aguardando_aprovacao'
        self.usuario.save(update_fields=['tipo'])
        aguardando = self.client.get(self.url)
        self.assertEqual(aguardando.data['proxima_acao']['link'], '/perfil')
        self.assertNotEqual(aguardando.data['proxima_acao']['link'], '/publicar')

        self.usuario.tipo = 'autor'
        self.usuario.save(update_fields=['tipo'])
        autor = self.client.get(self.url)
        self.assertEqual(autor.data['proxima_acao']['link'], '/publicar')

        self.usuario.tipo = 'admin'
        self.usuario.save(update_fields=['tipo'])
        admin = self.client.get(self.url)
        self.assertEqual(admin.data['proxima_acao']['link'], '/dashboard')


class PreferenciaTipograficaAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tipografia-user', password='x')
        self.perfil = Perfil.objects.create(usuario=self.user)
        self.usuario = Usuario.objects.create(
            user_auth=self.user,
            nome='Leitor Tipográfico',
            tipo='leitor',
            perfil=self.perfil,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = reverse('api-meu-perfil')

    def test_leitor_pode_escolher_leitura_clara_mas_nao_opcao_de_autor(self):
        resposta = self.client.patch(
            self.url,
            {'tipografia': Perfil.Tipografia.LEITURA_CLARA},
            format='json',
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['tipografia_efetiva'], Perfil.Tipografia.LEITURA_CLARA)

        bloqueada = self.client.patch(
            self.url,
            {'tipografia': Perfil.Tipografia.OFICINA_AUTOR},
            format='json',
        )
        self.assertEqual(bloqueada.status_code, 400)

    def test_autor_aprovado_pode_escolher_oficina_do_autor(self):
        self.usuario.tipo = 'autor'
        self.usuario.save(update_fields=['tipo'])

        resposta = self.client.patch(
            self.url,
            {'tipografia': Perfil.Tipografia.OFICINA_AUTOR},
            format='json',
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['tipografia_efetiva'], Perfil.Tipografia.OFICINA_AUTOR)

    def test_assinatura_paga_ativa_libera_edicao_premium(self):
        plano = Plano.objects.create(nome='Premium', preco='19.90', limite_livros=0)
        Assinatura.objects.create(usuario=self.user, plano=plano, ativa=True)

        resposta = self.client.patch(
            self.url,
            {'tipografia': Perfil.Tipografia.EDICAO_PREMIUM},
            format='json',
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(resposta.data['is_premium'])
        self.assertEqual(resposta.data['tipografia_efetiva'], Perfil.Tipografia.EDICAO_PREMIUM)

    def test_superuser_tem_acesso_a_todas_as_tipografias(self):
        self.user.is_staff = True
        self.user.is_superuser = True
        self.user.save(update_fields=['is_staff', 'is_superuser'])
        self.usuario.tipo = 'admin'
        self.usuario.save(update_fields=['tipo'])

        resposta = self.client.get(self.url)
        disponiveis = {
            opcao['chave']
            for opcao in resposta.data['tipografias_disponiveis']
            if opcao['disponivel']
        }

        self.assertEqual(disponiveis, {chave for chave, _nome in Perfil.Tipografia.choices})

        alteracao = self.client.patch(
            self.url,
            {'tipografia': Perfil.Tipografia.EDICAO_PREMIUM},
            format='json',
        )
        self.assertEqual(alteracao.status_code, 200)

    def test_admin_staff_sem_superuser_nao_herda_fontes_restritas(self):
        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        self.usuario.tipo = 'admin'
        self.usuario.save(update_fields=['tipo'])

        resposta = self.client.patch(
            self.url,
            {'tipografia': Perfil.Tipografia.OFICINA_AUTOR},
            format='json',
        )

        self.assertEqual(resposta.status_code, 400)
