from django.conf import settings
from django.db import models


class FeatureFlag(models.Model):
    chave = models.SlugField(max_length=80, unique=True)
    descricao = models.CharField(max_length=255, blank=True)
    habilitada = models.BooleanField(default=False)
    atualizada_em = models.DateTimeField(auto_now=True)
    atualizada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='feature_flags_atualizadas',
    )

    class Meta:
        db_table = 'feature_flags'
        ordering = ['chave']

    def __str__(self):
        return self.chave
