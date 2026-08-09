from django.db import models
from django.conf import settings

class Notificacao(models.Model):
    TIPO_CHOICES = (
        ('SOLICITACAO', 'Solicitação de Publicação'),
        ('COMUNIDADE', 'Comunidade/Comentário'),
        ('ASSINATURA', 'Assinatura & Pagamentos'),
        ('SISTEMA', 'Sistema/Aviso'),
    )

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notificacoes',
        verbose_name='Usuário'
    )
    titulo = models.CharField(max_length=150, verbose_name='Título')
    mensagem = models.TextField(verbose_name='Mensagem')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='SISTEMA', verbose_name='Tipo')
    link = models.CharField(max_length=255, blank=True, null=True, verbose_name='Link de Destino')
    lida = models.BooleanField(default=False, verbose_name='Lida')
    data_criacao = models.DateTimeField(auto_now_add=True, verbose_name='Data de Criação')

    class Meta:
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        ordering = ['-data_criacao']

    def __str__(self):
        return f"{self.usuario.username} - {self.titulo} ({'Lida' if self.lida else 'Não lida'})"