from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify


class Categoria(models.Model):
    id_categoria = models.AutoField(db_column='Id_Categorias', primary_key=True)
    nome = models.CharField(max_length=45, db_column='Nome_Categoria')

    class Meta:
        db_table = 'categorias'

    def __str__(self):
        return self.nome


class Livro(models.Model):
    # ... Seus campos existentes permanecem idênticos ...
    id_livro = models.AutoField(db_column='Id_Livros', primary_key=True)
    nome = models.CharField(max_length=45, db_column='Nome')
    autor = models.CharField(max_length=150,db_column="Autor")
    autor_nome = models.CharField(max_length=150,blank=True,default="")
    data_publicacao = models.CharField(max_length=45, db_column='Data_Publicacao')
    genero = models.CharField(max_length=45, db_column='Genero')
    avaliacao = models.CharField(max_length=45, db_column='Avaliacao')
    isbn = models.CharField(max_length=45, db_column='ISBN')
    # NOVOS CAMPOS PARA A PÁGINA DE INFO
    paginas = models.IntegerField(null=True, blank=True)
    edicao = models.CharField(max_length=100, null=True, blank=True, help_text="Ex: 1ª Edição, Traduzido por...")
    capa = models.CharField(max_length=255, null=True, blank=True)
    pdf = models.CharField(max_length=255, db_column='Caminho_PDF', null=True, blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.DO_NOTHING, db_column='Categorias_Id_Categorias')
    ORIGEM_CHOICES = [
    ("dominio_publico", "Domínio Público"),
    ("autor_independente", "Autor Independente"),
]     
STATUS_CHOICES = [
    ("pendente", "Pendente"),
    ("publicado", "Publicado"),
    ("rejeitado", "Rejeitado"),
]
origem = models.CharField(max_length=25,choices=ORIGEM_CHOICES,default="dominio_publico")
status = models.CharField(max_length=20,choices=STATUS_CHOICES,default="publicado")
class Meta:
        db_table = 'livros'

@property
def url_pdf_estatico(self):
        nome_limpo = slugify(self.nome)
        categoria_limpa = slugify(self.categoria.nome)
        return f"livros/{categoria_limpa}/{nome_limpo}.pdf"

    # --- NOVA PROPERTY DE CORREÇÃO PARA A CAPA ---
@property
def capa_url(self):
        """
        Retorna o caminho correto da imagem de capa. Se for uma string de caminho relativo, 
        insere o prefixo /media/. Se for nulo ou vazio, retorna None para acionar o fallback do template.
        """
        if not self.capa:
            return None
        
        # Se já for uma URL completa (ex: HTTP de API externa) ou se já começar com /media/
        if self.capa.startswith('http://') or self.capa.startswith('https://') or self.capa.startswith('/media/'):
            return self.capa
            
        # Caso seja apenas o nome do arquivo ou caminho interno (ex: "capas/livro.jpg")
        return f"/media/{self.capa}"


class SolicitacaoPublicacao(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="solicitacoes_publicacao"
    )

    livro = models.ForeignKey(
        Livro,
        on_delete=models.CASCADE,
        related_name="solicitacoes"
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ("pendente", "Pendente"),
            ("aprovado", "Aprovado"),
            ("rejeitado", "Rejeitado"),
        ],
        default="pendente"
    )

    observacao_admin = models.TextField(blank=True)

    data_envio = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "solicitacoes_publicacao"

    def __str__(self):
        return self.livro.nome

class Biblioteca(models.Model):
    STATUS_CHOICES = [
        ('lendo', 'Lendo'),
        ('lido', 'Lido'),
        ('quero_ler', 'Quero ler'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    livro = models.ForeignKey(Livro, on_delete=models.CASCADE)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='quero_ler'
    )

    favorito = models.BooleanField(default=False)
    nota = models.IntegerField(null=True, blank=True)
    resenha = models.CharField(max_length=200, null=True, blank=True) # NOVO CAMPO: Texto da avaliação
    data_adicao = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'livro')

    def __str__(self):
        return f"{self.user.username} - {self.livro.nome}"


class Perfil(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='perfil_da_biblioteca' # <- ADICIONE ISSO
    )

    foto = models.CharField(max_length=255, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    localizacao = models.CharField(max_length=100, blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ('pendente', 'Pendente'),
            ('aprovado', 'Aprovado'),
            ('rejeitado', 'Rejeitado')
        ],
        default='pendente'
    )

    class Meta:
        db_table = 'perfil'

    def __str__(self):
        return self.user.username
    
class Denuncia(models.Model):
    livro = models.ForeignKey(Livro, on_delete=models.CASCADE, related_name='denuncias')
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True) # Quem denunciou
    motivo = models.CharField(max_length=100)
    data_denuncia = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, 
        choices=[('pendente', 'Pendente'), ('analisado', 'Analisado'), ('removido', 'Obra Removida')],
        default='pendente'
    )

    class Meta:
        db_table = 'denuncias'

    def __str__(self):
        return f"Denúncia: {self.livro.nome} ({self.motivo})"