# usuarios/models.py
from django.db import models
from django.contrib.auth.models import User
from perfis.models import Perfil

class Usuario(models.Model):
    TIPO_USUARIO_CHOICES = [
        ('leitor', 'Leitor'),
        ('autor', 'Autor Independente'),
        ('admin', 'Administrador'),
    ]
    
    # Ligação oficial com o sistema de autenticação do Django
    user_auth = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_customizado', null=True, blank=True)
    nome = models.CharField(max_length=45, blank=True, null=True)
    
    # REMOVIDO: email e senha (o Django já gerencia de forma segura em user_auth)
    
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_USUARIO_CHOICES,
        default='leitor'
    )
    notificacao_autor = models.BooleanField(default=False)
    data_nascimento = models.CharField(max_length=45, blank=True, null=True)
    telefone = models.CharField(max_length=45, blank=True, null=True)
    foto = models.CharField(max_length=45, blank=True, null=True)
    descricao = models.CharField(max_length=45, blank=True, null=True)
    conquistas = models.CharField(max_length=45, blank=True, null=True)

<<<<<<< HEAD
=======
    # NOVOS CAMPOS DE AUDITORIA (LGPD)
    termos_aceitos = models.BooleanField(default=False)
    data_aceite_termos = models.DateTimeField(null=True, blank=True)

    # Novo campo CPF para atender a LGPD, com validação de formato
    cpf = models.CharField(max_length=14, blank=True, null=True, unique=True)

    # Tornando o perfil opcional na criação física para evitar o erro de quem nasce primeiro (usuário > perfil || perfil > usuario)
    # Alterado: adicionado related_name para evitar o conflito com perfis.Perfil.usuario
>>>>>>> origin/develop
    perfil = models.ForeignKey(
        Perfil, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='usuarios_vinculados' 
    )

    def __str__(self):
        return self.nome or f"Usuario {self.id}"