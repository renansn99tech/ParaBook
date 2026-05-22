from django.db import models
from usuarios.models import Usuario

class Mensagem(models.Model):
    remetente = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='mensagens_enviadas'
    )
    destinatario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='mensagens_recebidas'
    )
    conteudo = models.TextField()
    data_envio = models.DateTimeField(auto_now_add=True)
    lida = models.BooleanField(default=False)

    class Meta:
        db_table = 'mensagens'

    def __str__(self):
        return f"Mensagem de {self.remetente} para {self.destinatario}"