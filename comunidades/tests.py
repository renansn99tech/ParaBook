from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from comunidades.models import Comunidade, PostagemComunidade, RespostaPostagem
from notificacoes.models import Notificacao
from usuarios.models import Usuario


class RespostasPostagemAPITests(TestCase):
    def setUp(self):
        self.autor = User.objects.create_user(username='autor-post', password='x')
        self.membro = User.objects.create_user(username='membro-post', password='x')
        self.visitante = User.objects.create_user(username='visitante-post', password='x')
        self.comunidade = Comunidade.objects.create(
            nome='Comunidade com respostas',
            descricao='Espaço de conversa.',
            criador=self.autor,
        )
        self.comunidade.membros.add(self.autor, self.membro)
        self.postagem = PostagemComunidade.objects.create(
            comunidade=self.comunidade,
            autor=self.autor,
            titulo='Postagem para responder',
            conteudo='Conteúdo inicial.',
        )
        self.client = APIClient()

    def test_apenas_membro_pode_responder_e_contagem_e_atualizada(self):
        self.client.force_authenticate(user=self.visitante)
        negada = self.client.post('/api/v1/comunidades/respostas/', {
            'postagem': self.postagem.id,
            'conteudo': 'Não sou membro.',
        }, format='json')
        self.assertEqual(negada.status_code, 403)

        self.client.force_authenticate(user=self.membro)
        criada = self.client.post('/api/v1/comunidades/respostas/', {
            'postagem': self.postagem.id,
            'conteudo': 'Uma resposta válida.',
        }, format='json')
        self.assertEqual(criada.status_code, 201)
        self.assertEqual(criada.data['autor_nome'], self.membro.username)
        self.assertTrue(Notificacao.objects.filter(
            usuario=self.autor,
            tipo='COMUNIDADE',
            link=f'/comunidade/{self.comunidade.id}/conteudo',
        ).exists())

        postagens = self.client.get(
            f'/api/v1/comunidades/postagens/?comunidade={self.comunidade.id}',
        )
        self.assertEqual(postagens.status_code, 200)
        lista = postagens.data.get('results', postagens.data) if isinstance(postagens.data, dict) else postagens.data
        self.assertEqual(lista[0]['total_respostas'], 1)

    def test_resposta_so_pode_ser_editada_pelo_autor(self):
        self.client.force_authenticate(user=self.membro)
        criada = self.client.post('/api/v1/comunidades/respostas/', {
            'postagem': self.postagem.id,
            'conteudo': 'Texto original.',
        }, format='json')

        self.client.force_authenticate(user=self.autor)
        negada = self.client.patch(
            f"/api/v1/comunidades/respostas/{criada.data['id']}/",
            {'conteudo': 'Alteração indevida.'},
            format='json',
        )
        self.assertEqual(negada.status_code, 403)

        self.client.force_authenticate(user=self.membro)
        permitida = self.client.patch(
            f"/api/v1/comunidades/respostas/{criada.data['id']}/",
            {'conteudo': 'Texto corrigido.'},
            format='json',
        )
        self.assertEqual(permitida.status_code, 200)
        self.assertEqual(permitida.data['conteudo'], 'Texto corrigido.')


class PermissaoPostagemComunidadeTests(TestCase):
    def setUp(self):
        self.criador = User.objects.create_user(username='criador-sala', password='x')
        self.membro = User.objects.create_user(username='membro-sala', password='x')
        self.visitante = User.objects.create_user(username='visitante-sala', password='x')
        self.admin = User.objects.create_superuser(username='admin-postagem', password='x')
        self.comum = Comunidade.objects.create(
            nome='Sala da galera', descricao='Comunidade comum.', criador=self.criador,
        )
        self.oficial = Comunidade.objects.create(
            nome='Sala oficial', descricao='Comunidade oficial.',
            criador=self.admin, criada_por_sistema=True,
        )
        self.comum.membros.add(self.criador, self.membro)
        self.client = APIClient()

    def publicar(self, usuario, comunidade, titulo='Postagem'):
        self.client.force_authenticate(usuario)
        return self.client.post('/api/v1/comunidades/postagens/', {
            'comunidade': comunidade.pk,
            'titulo': titulo,
            'conteudo': 'Conteúdo de teste.',
        }, format='json')

    def test_visitante_nao_membro_nao_pode_publicar(self):
        resposta = self.publicar(self.visitante, self.comum)

        self.assertEqual(resposta.status_code, 403)
        self.assertFalse(PostagemComunidade.objects.filter(autor=self.visitante).exists())

    def test_membro_pode_publicar(self):
        resposta = self.publicar(self.membro, self.comum)

        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data['autor_nome'], self.membro.username)

    def test_admin_publica_em_oficial_e_da_galera_sem_ser_membro(self):
        comum = self.publicar(self.admin, self.comum, 'Comunicado na galera')
        oficial = self.publicar(self.admin, self.oficial, 'Comunicado oficial')

        self.assertEqual(comum.status_code, 201)
        self.assertEqual(oficial.status_code, 201)
        self.assertEqual(comum.data['autor_nome'], 'admin')
        self.assertEqual(oficial.data['autor_nome'], 'admin')
        self.assertFalse(comum.data['autor_perfil_clicavel'])
        self.assertFalse(oficial.data['autor_perfil_clicavel'])
        self.assertFalse(self.comum.membros.filter(pk=self.admin.pk).exists())


class IdentidadeAdministrativaComunidadeTests(TestCase):
    def setUp(self):
        self.leitor = User.objects.create_user(username='leitor-comum', password='x')
        Usuario.objects.create(user_auth=self.leitor, nome='Leitor Comum', tipo='leitor')
        self.admin = User.objects.create_user(
            username='admin-real-comunidade', password='x', is_staff=True,
        )
        Usuario.objects.create(user_auth=self.admin, nome='Nome Operacional', tipo='admin')
        self.outro_admin = User.objects.create_user(
            username='admin-visor', password='x', is_staff=True,
        )
        Usuario.objects.create(user_auth=self.outro_admin, nome='Admin Visor', tipo='admin')
        self.comunidade = Comunidade.objects.create(
            nome='Comunidade administrativa',
            descricao='Teste de identidade.',
            criador=self.leitor,
        )
        self.comunidade.membros.add(self.leitor, self.admin, self.outro_admin)
        self.postagem_admin = PostagemComunidade.objects.create(
            comunidade=self.comunidade,
            autor=self.admin,
            titulo='Comunicado da equipe',
            conteudo='Conteúdo administrativo.',
        )
        self.resposta_admin = RespostaPostagem.objects.create(
            postagem=self.postagem_admin,
            autor=self.admin,
            conteudo='Resposta da equipe.',
        )
        self.client = APIClient()

    def test_leitor_ve_admin_como_identificador_generico_e_sem_link(self):
        self.client.force_authenticate(self.leitor)
        membros = self.client.get(
            f'/api/v1/comunidades/comunidades/{self.comunidade.id}/membros/',
        ).data['membros']
        membro_admin = next(item for item in membros if item['id'] == self.admin.id)
        self.assertEqual(membro_admin['username'], 'admin')
        self.assertEqual(membro_admin['nome_exibicao'], 'Admin ParaBook')
        self.assertFalse(membro_admin['perfil_clicavel'])

        postagens = self.client.get(
            f'/api/v1/comunidades/postagens/?comunidade={self.comunidade.id}',
        ).data
        postagens = postagens.get('results', postagens) if isinstance(postagens, dict) else postagens
        postagem = next(item for item in postagens if item['id'] == self.postagem_admin.id)
        self.assertEqual(postagem['autor_nome'], 'admin')
        self.assertFalse(postagem['autor_perfil_clicavel'])

        respostas = self.client.get(
            f'/api/v1/comunidades/respostas/?postagem={self.postagem_admin.id}',
        ).data
        respostas = respostas.get('results', respostas) if isinstance(respostas, dict) else respostas
        resposta = next(item for item in respostas if item['id'] == self.resposta_admin.id)
        self.assertEqual(resposta['autor_nome'], 'admin')
        self.assertFalse(resposta['autor_perfil_clicavel'])

    def test_admin_tambem_ve_identidade_institucional_na_comunidade(self):
        self.client.force_authenticate(self.outro_admin)
        membros = self.client.get(
            f'/api/v1/comunidades/comunidades/{self.comunidade.id}/membros/',
        ).data['membros']
        membro_admin = next(item for item in membros if item['id'] == self.admin.id)
        self.assertEqual(membro_admin['username'], 'admin')
        self.assertEqual(membro_admin['nome_exibicao'], 'Admin ParaBook')
        self.assertFalse(membro_admin['perfil_clicavel'])

    def test_notificacao_de_resposta_nao_vaza_username_do_admin(self):
        postagem_leitor = PostagemComunidade.objects.create(
            comunidade=self.comunidade,
            autor=self.leitor,
            titulo='Pergunta para a equipe',
            conteudo='Uma pergunta.',
        )
        self.client.force_authenticate(self.admin)

        resposta = self.client.post('/api/v1/comunidades/respostas/', {
            'postagem': postagem_leitor.id,
            'conteudo': 'Resposta institucional.',
        }, format='json')

        self.assertEqual(resposta.status_code, 201)
        notificacao = Notificacao.objects.get(usuario=self.leitor, titulo='Nova resposta na sua postagem')
        self.assertIn('@admin respondeu', notificacao.mensagem)
        self.assertNotIn(self.admin.username, notificacao.mensagem)
