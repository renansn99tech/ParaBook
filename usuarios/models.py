from django.db import models
from perfis.models import Perfil

class Usuario(models.Model):
    nome = models.CharField(max_length=45, blank=True, null=True)
    email = models.CharField(max_length=45, blank=True, null=True)
    data_nascimento = models.CharField(max_length=45, blank=True, null=True)
    senha = models.CharField(max_length=45, blank=True, null=True)
    telefone = models.CharField(max_length=45, blank=True, null=True)
    foto = models.CharField(max_length=45, blank=True, null=True)
    descricao = models.CharField(max_length=45, blank=True, null=True)
    conquistas = models.CharField(max_length=45, blank=True, null=True)

    perfil = models.ForeignKey(Perfil, on_delete=models.CASCADE)

    def __str__(self):
        return self.nome or f"Usuario {self.id}"
