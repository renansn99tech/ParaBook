from django.db import models
from usuarios.models import Usuario

class Postagem(models.Model):
    titulo_postagem = models.CharField(max_length=45, blank=True, null=True)
    data_hora = models.CharField(max_length=45, blank=True, null=True)
    conteudo = models.CharField(max_length=45, blank=True, null=True)

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)

    def __str__(self):
        return self.titulo_postagem or f"Postagem {self.id}"