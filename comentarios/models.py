from django.db import models
from usuarios.models import Usuario


class Comentario(models.Model):
    conteudo = models.TextField(blank=True, null=True)
    data_hora = models.DateTimeField(auto_now_add=True)

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='comentarios'
    )


    def __str__(self):
        return f"Comentario {self.id} - {self.usuario}"
