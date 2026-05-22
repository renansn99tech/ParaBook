from django.db import models
from usuarios.models import Usuario

class Postagem(models.Model):
    titulo_postagem = models.CharField(max_length=45, blank=True, null=True)
    data_hora = models.DateTimeField(auto_now_add=True)
    conteudo = models.TextField(blank=True, null=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)

    class Meta:
        db_table = 'postagens'

    def __str__(self):
        return self.titulo_postagem or "Post"