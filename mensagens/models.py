from django.db import models
from usuarios.models import Usuario


class Mensagem(models.Model):
    conteudo = models.TextField()
    data_hora = models.DateTimeField(auto_now_add=True)

    remetente = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='mensagens_enviadas'
    )

    destinatario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='mensagens_recebidas'
    )

    lida = models.BooleanField(default=False)

    def __str__(self):
        return f"De {self.remetente} para {self.destinatario}"