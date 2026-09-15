from django.db import models
from django.conf import settings # Boa prática: importa o usuário global do projeto
from django.core.validators import MinValueValidator, MaxValueValidator

# Frase de status padrão atribuída a todo leitor recém-cadastrado.
# Centralizada aqui para que o cadastro (que a grava) e a checagem de
# "perfil já personalizado" (onboarding) usem exatamente o mesmo texto.
FRASE_STATUS_PADRAO_LEITOR = "Olá! Sou um novo leitor do ParaBook."
FRASE_STATUS_PADRAO_AUTOR = "Olá! Sou um novo autor do ParaBook."

class Perfil(models.Model):
    class Tipografia(models.TextChoices):
        PADRAO = 'padrao', 'ParaBook Original'
        LEITURA_CLARA = 'leitura_clara', 'Leitura Clara'
        OFICINA_AUTOR = 'oficina_autor', 'Oficina do Autor'
        EDICAO_PREMIUM = 'edicao_premium', 'Edição Premium'

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
    capa = models.ImageField(upload_to='capas_perfil/', blank=True, null=True)
    bio = models.TextField(max_length=800, blank=True, null=True)
    localizacao = models.CharField(max_length=100, blank=True, null=True)
    meta_leitura_anual = models.PositiveSmallIntegerField(
        default=12,
        validators=[MinValueValidator(1), MaxValueValidator(1000)],
    )
    tipografia = models.CharField(
        max_length=24,
        choices=Tipografia.choices,
        default=Tipografia.PADRAO,
    )
    exibir_idade = models.BooleanField(default=True)
    exibir_data_nascimento = models.BooleanField(default=True)
    exibir_email = models.BooleanField(default=True)

    # --- NOVO CAMPO: CONTROLE DE PRIVACIDADE ---
    perfil_privado = models.BooleanField(default=False)
    
    # Dica: O 'username' já existe no modelo User padrão do Django. 
    # Você pode remover daqui para evitar duplicidade de dados (Clean Code), 
    # a menos que haja uma regra de negócio muito específica para mantê-lo.
    # username = models.CharField(max_length=30, blank=True, null=True) 

    def __str__(self):
        return self.descricao_perfil or f"Perfil de {self.usuario}"
