from django.db import models

class Perfil(models.Model):
    historico = models.CharField(max_length=45, blank=True, null=True)
    descricao_perfil = models.CharField(max_length=45, blank=True, null=True)

    def __str__(self):
        return self.descricao_perfil or f"Perfil {self.id}"