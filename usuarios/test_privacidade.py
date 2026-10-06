from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from comunidades.models import Comunidade, PostagemComunidade, RespostaPostagem
from usuarios.models import EventoGovernancaConta, Usuario


class EncerramentoPrivacidadeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='titular-g5', password='SenhaForte123!')
        Usuario.objects.create(user_auth=self.user, nome='Titular')
        self.terceiro = User.objects.create_user(username='terceiro-g5', password='x')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def encerrar(self):
        return self.client.delete('/api/v1/auth/excluir-conta/', {'senha_atual': 'SenhaForte123!'}, format='json')

    def test_historico_governanca_nao_impede_encerramento(self):
        EventoGovernancaConta.objects.create(
            usuario=self.user, tipo='papel_alterado', motivo='Decisão registrada',
            metadados={'papel_anterior': 'leitor', 'papel_novo': 'autor'},
        )
        self.assertEqual(self.encerrar().status_code, 204)

    def test_encerramento_remove_texto_proprio_e_preserva_resposta_de_terceiro(self):
        comunidade = Comunidade.objects.create(nome='Ensaio', descricao='Sintético')
        post = PostagemComunidade.objects.create(
            comunidade=comunidade, autor=self.user, titulo='Nome pessoal', conteudo='Texto pessoal',
        )
        resposta = RespostaPostagem.objects.create(postagem=post, autor=self.terceiro, conteudo='Resposta de terceiro')
        self.assertEqual(self.encerrar().status_code, 204)
        self.assertTrue(RespostaPostagem.objects.filter(pk=resposta.pk).exists())
        post.refresh_from_db()
        self.assertEqual(post.conteudo, '')
        self.assertIsNone(post.autor_id)
