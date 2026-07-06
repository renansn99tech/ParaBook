from django.db import models
from django.conf import settings # Boa prática: importa o usuário global do projeto

class Perfil(models.Model):
    # A MÁGICA ACONTECE AQUI: Ligação 1-para-1 com o Usuário
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='perfil',
        null=True,  # Permite valor nulo no banco de dados
        blank=True  # Permite que o campo fique vazio em formulários
    )
    
    historico = models.CharField(max_length=45, blank=True, null=True)
    descricao_perfil = models.CharField(max_length=45, blank=True, null=True)
    foto = models.ImageField(upload_to='avatares/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    localizacao = models.CharField(max_length=100, blank=True, null=True)
    
    # Dica: O 'username' já existe no modelo User padrão do Django. 
    # Você pode remover daqui para evitar duplicidade de dados (Clean Code), 
    # a menos que haja uma regra de negócio muito específica para mantê-lo.
    # username = models.CharField(max_length=30, blank=True, null=True) 

    def __str__(self):
        return self.descricao_perfil or f"Perfil de {self.usuario}"