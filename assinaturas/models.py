from django.db import models
from django.conf import settings

class Plano(models.Model):
    nome = models.CharField(max_length=100)
    preco = models.DecimalField(max_digits=8, decimal_places=2)
    limite_livros = models.IntegerField(default=0, help_text="0 para ilimitado ou limite do plano")
    anuncios = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nome} - R$ {self.preco}"

class Assinatura(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assinatura'
    )
    plano = models.ForeignKey(
        Plano,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    ativa = models.BooleanField(default=False)
    data_inicio = models.DateTimeField(auto_now_add=True)
    data_fim = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        status = "Ativa" if self.ativa else "Inativa"
        return f"{self.usuario} - {self.plano.nome if self.plano else 'Sem Plano'} ({status})"