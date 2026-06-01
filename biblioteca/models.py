from django.db import models

# Create your models here.
from django.db import models


class Categoria(models.Model):
    id_categoria = models.AutoField(db_column='Id_Categorias', primary_key=True)
    nome = models.CharField(max_length=45, db_column='Nome_Categoria')

    class Meta:
        db_table = 'categorias'  # usa tabela existente
        managed = False  # Django NÃO cria essa tabela

    def __str__(self):
        return self.nome

class Livro(models.Model):
    id_livro = models.AutoField(db_column='Id_Livros', primary_key=True)
    nome = models.CharField(max_length=45, db_column='Nome')
    autor = models.CharField(max_length=45, db_column='Autor')
    data_publicacao = models.CharField(max_length=45, db_column='Data_Publicacao')
    genero = models.CharField(max_length=45, db_column='Genero')
    avaliacao = models.CharField(max_length=45, db_column='Avaliacao')
    isbn = models.CharField(max_length=45, db_column='ISBN')

    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.DO_NOTHING,
        db_column='Categorias_Id_Categorias'
    )

    class Meta:
        db_table = 'livros'
        managed = False  # MUITO IMPORTANTE

    def __str__(self):
        return self.nome