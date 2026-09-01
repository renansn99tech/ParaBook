# biblioteca/models.py
import uuid

from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


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
        ("licenciado", "Acervo Licenciado"),
    ]
    MODELO_ACESSO_CHOICES = [
        ("gratuito", "Leitura gratuita"),
        ("assinante", "Incluído na assinatura"),
        ("amostra", "Somente amostra"),
    ]
    STATUS_CHOICES = [
        ("pendente", "Pendente"),
        ("publicado", "Publicado"),
        ("rejeitado", "Rejeitado"),
        ("removido", "Removido na Lixeira"), # NOVO
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
    pdf_amostra = models.FileField(
        upload_to='livros/amostras/', null=True, blank=True, verbose_name="PDF da amostra"
    )
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='livros', verbose_name="Categoria")
    origem = models.CharField(max_length=25, choices=ORIGEM_CHOICES, default="dominio_publico", verbose_name="Origem da Obra")
    modelo_acesso = models.CharField(
        max_length=12,
        choices=MODELO_ACESSO_CHOICES,
        default="gratuito",
        db_index=True,
        verbose_name="Modelo de acesso",
    )
    disponivel_de = models.DateTimeField(null=True, blank=True, verbose_name="Disponível a partir de")
    disponivel_ate = models.DateTimeField(null=True, blank=True, verbose_name="Disponível até")
    territorio_cultural = models.CharField(
        max_length=120,
        blank=True,
        verbose_name="Território cultural",
        help_text="Identificação editorial voluntária, como Belém/PA ou Amazônia.",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="publicado", verbose_name="Status de Publicação")
    data_remocao = models.DateTimeField(null=True, blank=True, verbose_name="Data de Remoção") # NOVO

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

    def clean(self):
        super().clean()
        if self.disponivel_de and self.disponivel_ate and self.disponivel_de >= self.disponivel_ate:
            raise ValidationError({
                'disponivel_ate': 'A data final deve ser posterior à data inicial.'
            })
        if self.modelo_acesso == 'amostra' and not self.pdf_amostra:
            raise ValidationError({
                'pdf_amostra': 'Envie um PDF de amostra para este modelo de acesso.'
            })

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
    favoritado_em = models.DateTimeField(null=True, blank=True, verbose_name="Favoritado em")
    nota = models.PositiveSmallIntegerField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Nota do Leitor"
    )
    resenha = models.TextField(null=True, blank=True, verbose_name="Resenha/Avaliação")
    data_adicao = models.DateTimeField(auto_now_add=True, verbose_name="Adicionado em")
    pagina_atual = models.PositiveIntegerField(default=0, verbose_name="Página atual")
    ultima_leitura_em = models.DateTimeField(null=True, blank=True, verbose_name="Última leitura")
    data_conclusao = models.DateTimeField(null=True, blank=True, verbose_name="Conclusão da leitura")
    avaliada_em = models.DateTimeField(null=True, blank=True, verbose_name="Última avaliação")

    # Flags para controle de gamificação antifraude
    xp_ganho_adicao = models.BooleanField(default=False)
    xp_ganho_leitura = models.BooleanField(default=False)
    xp_ganho_avaliacao = models.BooleanField(default=False)
    xp_ganho_favorito = models.BooleanField(default=False)
    xp_ganho_resenha = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Item de Biblioteca"
        verbose_name_plural = "Itens de Biblioteca"
        ordering = ['-data_adicao']
        constraints = [
            models.UniqueConstraint(fields=['user', 'livro'], name='unique_user_livro_estante')
        ]

    def __str__(self):
        return f"{self.user.username} - {self.livro.titulo}"


class EventoLeitura(models.Model):
    class Origem(models.TextChoices):
        REAL = 'real', 'Leitura real'
        BACKFILL = 'backfill', 'Dado anterior à telemetria'

    livro = models.ForeignKey(
        Livro,
        on_delete=models.CASCADE,
        related_name='eventos_leitura',
        verbose_name='Livro',
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='eventos_leitura',
        verbose_name='Leitor',
    )
    sessao_id = models.UUIDField(default=uuid.uuid4, db_index=True, verbose_name='Sessão de leitura')
    pagina = models.PositiveIntegerField(default=0)
    percentual = models.PositiveSmallIntegerField(default=0)
    duracao_segundos = models.PositiveIntegerField(default=0)
    origem = models.CharField(max_length=12, choices=Origem.choices, default=Origem.REAL)
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'eventos_leitura'
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['livro', 'criado_em'], name='evento_livro_data_idx'),
            models.Index(fields=['livro', 'pagina'], name='evento_livro_pag_idx'),
            models.Index(fields=['usuario', 'sessao_id'], name='evento_user_sessao_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(percentual__gte=0, percentual__lte=100),
                name='evento_percentual_0_100',
            ),
        ]

    def __str__(self):
        return f'{self.livro_id} · {self.sessao_id} · página {self.pagina}'


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

    arquivada = models.BooleanField(default=False)
    data_arquivamento = models.DateTimeField(null=True, blank=True)

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


class DeclaracaoAutoria(models.Model):
    solicitacao = models.OneToOneField(
        SolicitacaoPublicacao,
        on_delete=models.CASCADE,
        related_name='declaracao',
    )
    cpf_digest = models.CharField(max_length=64)
    cpf_final = models.CharField(max_length=4)
    registro_autoral = models.CharField(max_length=100, blank=True)
    numero_registro = models.CharField(max_length=20, blank=True)
    versao_termos = models.CharField(max_length=30)
    declarado_em = models.DateTimeField(auto_now_add=True)
    ip_origem = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'declaracoes_autoria'

    def __str__(self):
        return f'Declaração da solicitação {self.solicitacao_id}'
