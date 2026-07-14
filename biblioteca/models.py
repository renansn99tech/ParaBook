# biblioteca/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator


class Categoria(models.Model):
    nome = models.CharField(max_length=50, unique=True, verbose_name="Nome da Categoria")

    class Meta:
        db_table = 'categorias'
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Livro(models.Model):
    ORIGEM_CHOICES = [
        ("dominio_publico", "Domínio Público"),
        ("autor_independente", "Autor Independente"),
    ]     
    STATUS_CHOICES = [
        ("pendente", "Pendente"),
        ("publicado", "Publicado"),
        ("rejeitado", "Rejeitado"),
    ]

    titulo = models.CharField(max_length=255, default="Sem Título", verbose_name="Título")
    autor = models.CharField(max_length=150, verbose_name="Autor")
    ano_publicacao = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name="Ano de Publicação")
    avaliacao = models.DecimalField(max_digits=3, decimal_places=2, default=0.0, verbose_name="Avaliação Média")
    isbn = models.CharField(max_length=20, unique=True, blank=True, null=True, verbose_name="ISBN")
    paginas = models.PositiveIntegerField(null=True, blank=True, verbose_name="Quantidade de Páginas")
    edicao = models.CharField(max_length=100, null=True, blank=True, help_text="Ex: 1ª Edição, Traduzido por...", verbose_name="Edição")
    capa = models.ImageField(upload_to='capas/', null=True, blank=True, verbose_name="Imagem de Capa")
    pdf = models.FileField(upload_to='livros/', null=True, blank=True, verbose_name="Arquivo PDF")
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='livros', verbose_name="Categoria")
    origem = models.CharField(max_length=25, choices=ORIGEM_CHOICES, default="dominio_publico", verbose_name="Origem da Obra")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="publicado", verbose_name="Status de Publicação")

    class Meta:
        db_table = 'livros'
        verbose_name = "Livro"
        verbose_name_plural = "Livros"
        ordering = ['-id']
        indexes = [
            models.Index(fields=['titulo'], name='livro_titulo_idx'),
            models.Index(fields=['status'], name='livro_status_idx'),
        ]

    def __str__(self):
        return self.titulo

    # =========================================================================
    # PROPRIEDADES DE RETROCOMPATIBILIDADE (Evita quebra nos templates de lista)
    # =========================================================================
    @property
    def id_livro(self):
        """Mapeia dinamicamente o ID do livro caso o template busque pelo nome antigo"""
        return self.id

    @property
    def url_pdf_estatico(self):
        nome_limpo = slugify(self.titulo)
        categoria_limpa = slugify(self.categoria.nome)
        return f"livros/{categoria_limpa}/{nome_limpo}.pdf"

    @property
    def capa_url(self):
        """Mantém compatibilidade com templates legados que chamam a propriedade diretamente."""
        if not self.capa:
            return None
        return self.capa.url


class Biblioteca(models.Model):
    STATUS_CHOICES = [
        ('lendo', 'Lendo'),
        ('lido', 'Lido'),
        ('quero_ler', 'Quero ler'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='itens_biblioteca', verbose_name="Usuário")
    livro = models.ForeignKey(Livro, on_delete=models.CASCADE, related_name='usuarios_interagiram', verbose_name="Livro")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='quero_ler', verbose_name="Status de Leitura")
    favorito = models.BooleanField(default=False, verbose_name="Favorito")
    nota = models.PositiveSmallIntegerField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Nota do Leitor"
    )
    resenha = models.TextField(null=True, blank=True, verbose_name="Resenha/Avaliação")
    data_adicao = models.DateTimeField(auto_now_add=True, verbose_name="Adicionado em")

    class Meta:
        verbose_name = "Item de Biblioteca"
        verbose_name_plural = "Itens de Biblioteca"
        ordering = ['-data_adicao']
        constraints = [
            models.UniqueConstraint(fields=['user', 'livro'], name='unique_user_livro_estante')
        ]

    def __str__(self):
        return f"{self.user.username} - {self.livro.titulo}"


class Perfil(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='perfil_da_biblioteca',
        verbose_name="Usuário de Autenticação"
    )
    foto = models.ImageField(upload_to='perfis/', blank=True, null=True, verbose_name="Foto de Perfil")
    bio = models.TextField(blank=True, null=True, verbose_name="Biografia")
    localizacao = models.CharField(max_length=100, blank=True, null=True, verbose_name="Localização")
    status = models.CharField(
        max_length=20,
        choices=[
            ('perfil_pendente', 'Pendente'),
            ('perfil_aprovado', 'Aprovado'),
            ('perfil_rejeitado', 'Rejeitado')
        ],
        default='perfil_pendente',
        verbose_name="Status do Perfil"
    )

    class Meta:
        db_table = 'perfil'
        verbose_name = "Perfil de Usuário"
        verbose_name_plural = "Perfis de Usuários"

    def __str__(self):
        return self.user.username
    

class Denuncia(models.Model):
    livro = models.ForeignKey(Livro, on_delete=models.CASCADE, related_name='denuncias', verbose_name="Livro Denunciado")
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='denuncias_feitas', verbose_name="Denunciante")
    motivo = models.CharField(max_length=150, verbose_name="Motivo")
    data_denuncia = models.DateTimeField(auto_now_add=True, verbose_name="Data da Denúncia")
    status = models.CharField(
        max_length=20, 
        choices=[('pendente', 'Pendente'), ('analisado', 'Analisado'), ('removido', 'Obra Removida')],
        default='pendente',
        verbose_name="Status da Denúncia"
    )

    class Meta:
        db_table = 'denuncias'
        verbose_name = "Denúncia"
        verbose_name_plural = "Denúncias"
        ordering = ['-data_denuncia']

    def __str__(self):
        return f"Denúncia: {self.livro.titulo} ({self.motivo})"


class SolicitacaoPublicacao(models.Model):
    STATUS_CHOICES = [
        ("pendente", "Pendente"),
        ("aprovado", "Aprovado"),
        ("rejeitado", "Rejeitado"),
    ]

    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='solicitacoes_publicacao',
        verbose_name='Autor Solicitante'
    )

    livro = models.OneToOneField(
        Livro,
        on_delete=models.CASCADE,
        related_name='solicitacao_publicacao',
        verbose_name='Livro'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendente'
    )

    observacao_admin = models.TextField(
        blank=True,
        null=True
    )

    data_envio = models.DateTimeField(
        auto_now_add=True
    )

    data_analise = models.DateTimeField(
        blank=True,
        null=True
    )

    class Meta:
        db_table = "solicitacoes_publicacao"
        ordering = ["-data_envio"]
        verbose_name = "Solicitação de Publicação"
        verbose_name_plural = "Solicitações de Publicação"

    def __str__(self):
        return f"{self.livro.titulo} ({self.status})"

    # =========================================================================
    # COMPATIBILIDADE COM O TEMPLATE DO PAINEL ADMIN (Mapeia o livro associado)
    # =========================================================================
    @property
    def titulo(self):
        return self.livro.titulo if self.livro else "Sem Título"

    @property
    def categoria(self):
        return self.livro.categoria if self.livro else None

    @property
    def nome(self):
        """Retorna o nome do autor do livro"""
        return self.livro.autor if self.livro else ""

    @property
    def capa(self):
        return self.livro.capa if self.livro else None

    @property
    def pdf(self):
        return self.livro.pdf if self.livro else None