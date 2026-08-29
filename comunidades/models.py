from django.db import models
from django.conf import settings # Boa prática: importa o usuário global do projeto
from django.contrib.auth.models import User


class Comunidade(models.Model):
    nome = models.CharField(max_length=100)
    descricao = models.TextField()
    data_criacao = models.DateTimeField(auto_now_add=True)

    criador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comunidades_criadas'
    )

    # --- NOVOS CAMPOS DE GOVERNANÇA ---
    criada_por_sistema = models.BooleanField(default=False) # True = Oficial do ParaBook, False = Usuário
    em_manutencao = models.BooleanField(default=False) # Bloqueia acessos temporariamente
    max_participantes = models.IntegerField(default=200) # Sistema mudará para 500 automaticamente
    total_denuncias = models.IntegerField(default=0) # Controle para moderação do Admin
    
    # NOVO CAMPO: Relação Muitos-para-Muitos
    membros = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='comunidades_inscritas',
        blank=True
    )

    def __str__(self):
        return self.nome


class PostagemComunidade(models.Model):
    comunidade = models.ForeignKey(
        Comunidade,
        on_delete=models.CASCADE,
        related_name='postagens'
    )

    autor = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    titulo = models.CharField(
        max_length=200
    )

    conteudo = models.TextField()

    imagem = models.ImageField(
        upload_to='comunidades/posts/',
        null=True,
        blank=True
    )

    criado_em = models.DateTimeField(
        auto_now_add=True
    )

    atualizado_em = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo


class RespostaPostagem(models.Model):
    postagem = models.ForeignKey(
        PostagemComunidade,
        on_delete=models.CASCADE,
        related_name='respostas',
    )
    autor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='respostas_comunidade',
    )
    conteudo = models.TextField(max_length=1200)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['criado_em']
        indexes = [
            models.Index(fields=['postagem', 'criado_em'], name='com_post_criado_idx'),
            models.Index(fields=['autor', 'criado_em'], name='com_resp_autor_criado_idx'),
        ]

    def __str__(self):
        return f'Resposta de {self.autor} em {self.postagem}'


class DenunciaComunidade(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('acolhida', 'Acolhida'),
        ('arquivada', 'Arquivada'),
    ]

    comunidade = models.ForeignKey(Comunidade, on_delete=models.CASCADE, related_name='denuncias_registradas')
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    motivo = models.CharField(max_length=100)
    data_denuncia = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente', db_index=True)
    data_analise = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'denuncias_comunidades'

    def __str__(self):
        return f"Denúncia: {self.comunidade.nome} ({self.motivo})"
