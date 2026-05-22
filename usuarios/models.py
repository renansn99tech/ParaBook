from django.db import models
from perfis.models import Perfil

class Usuario(models.Model):
    nome = models.CharField(max_length=45, blank=True, null=True)
    email = models.CharField(max_length=45, blank=True, null=True)
    data_nascimento = models.DateField(blank=True, null=True)
    senha = models.CharField(max_length=128)
    telefone = models.CharField(max_length=45, blank=True, null=True)
    foto = models.CharField(max_length=255, blank=True, null=True)
    descricao = models.TextField(blank=True, null=True)
    conquistas = models.TextField(blank=True, null=True)
    perfil = models.ForeignKey(Perfil, on_delete=models.CASCADE)
    
class UsuarioLivro(models.Model):
    usuario = models.ForeignKey('Usuario', on_delete=models.CASCADE)
    livro = models.ForeignKey('livros.Livro', on_delete=models.CASCADE)

    class Meta:
        db_table = 'usuarios'

    class Meta:
        db_table = 'usuarios_has_livros'
        unique_together = ('usuario', 'livro')

    def __str__(self):
        return self.nome or "Usuário"
