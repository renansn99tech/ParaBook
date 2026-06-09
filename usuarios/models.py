from django.db import models
from django.contrib.auth.models import User # Importa o usuário padrão do Django, utilizado nas views do app
from perfis.models import Perfil

class Usuario(models.Model):
    user_auth = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_customizado', null=True, blank=True)
    nome = models.CharField(max_length=45, blank=True, null=True)
    email = models.CharField(max_length=45, blank=True, null=True)
    data_nascimento = models.CharField(max_length=45, blank=True, null=True)
    senha = models.CharField(max_length=45, blank=True, null=True)
    telefone = models.CharField(max_length=45, blank=True, null=True)
    foto = models.CharField(max_length=45, blank=True, null=True)
    descricao = models.CharField(max_length=45, blank=True, null=True)
    conquistas = models.CharField(max_length=45, blank=True, null=True)

    # Tornando o perfil opcional na criação física para evitar o erro de quem nasce primeiro (usuário > perfil || perfil > usuario)
    perfil = models.ForeignKey(Perfil, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.nome or f"Usuario {self.id}"
