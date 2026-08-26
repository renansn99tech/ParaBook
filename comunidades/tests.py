from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from comunidades.models import Comunidade, PostagemComunidade
from notificacoes.models import Notificacao


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
