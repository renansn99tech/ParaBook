from django.db import models

class Perfil(models.Model):
    historico = models.CharField(max_length=45, blank=True, null=True)
    descricao_perfil = models.CharField(max_length=45, blank=True, null=True)
    
    # NOVOS CAMPOS (Adicionados via ALTER TABLE no script)
    foto = models.CharField(max_length=255, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    localizacao = models.CharField(max_length=100, blank=True, null=True)
    username = models.CharField(max_length=30, blank=True, null=True)

    def __str__(self):
        return self.descricao_perfil or f"Perfil {self.id}"