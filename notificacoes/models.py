from django.db import models
from django.conf import settings

class Notificacao(models.Model):
    TIPO_CHOICES = (
        ('SOLICITACAO', 'Solicitação de Publicação'),
        ('COMUNIDADE', 'Comunidade/Comentário'),
        ('ASSINATURA', 'Assinatura & Pagamentos'),
        ('LIVRO', 'Novidades e Leitura'),
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
    lida = models.BooleanField(default=False, db_index=True, verbose_name='Lida')
    data_criacao = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Data de Criação')

    class Meta:
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        ordering = ['-data_criacao']
        indexes = [
            models.Index(fields=['usuario', 'lida'], name='notif_user_lida_idx'),
        ]

    def __str__(self):
        return f"{self.usuario.username} - {self.titulo} ({'Lida' if self.lida else 'Não lida'})"


class NotificacaoLegadaMigracao(models.Model):
    """Proveniência idempotente da consolidação de ``usuarios.Notificacao``."""

    notificacao = models.OneToOneField(
        Notificacao,
        on_delete=models.CASCADE,
        related_name='migracao_legada_usuarios',
    )
    legado_id = models.PositiveBigIntegerField(unique=True)
    legado_usuario_id = models.PositiveBigIntegerField(db_index=True)
    link_rejeitado = models.BooleanField(default=False)
    snapshot_pos_migracao_hash = models.CharField(max_length=64)
    migrado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificacoes_migracao_legado_usuarios'
        verbose_name = 'Proveniência de notificação legada'
        verbose_name_plural = 'Proveniências de notificações legadas'

    def __str__(self):
        return (
            f"usuarios.Notificacao#{self.legado_id} → "
            f"notificacoes.Notificacao#{self.notificacao_id}"
        )
