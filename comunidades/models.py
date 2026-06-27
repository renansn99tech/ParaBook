from django.db import models
from django.contrib.auth.models import User


class Comunidade(models.Model):
    nome = models.CharField(max_length=100)
    descricao = models.TextField()
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class PostagemComunidade(models.Model):
    comunidade = models.ForeignKey(
        Comunidade,
        on_delete=models.CASCADE,
        related_name='postagens'
    )

    autor = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    titulo = models.CharField(
        max_length=200
    )

    conteudo = models.TextField()

    imagem = models.ImageField(
        upload_to='comunidades/posts/',
        null=True,
        blank=True
    )

    criado_em = models.DateTimeField(
        auto_now_add=True
    )

    atualizado_em = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo