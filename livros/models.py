# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Livros(models.Model):
    pk = models.CompositePrimaryKey('Id_Livros', 'Categorias_Id_Categorias')
    id_livros = models.AutoField(db_column='Id_Livros')  # Field name made lowercase.
    nome = models.CharField(db_column='Nome', max_length=45, blank=True, null=True)  # Field name made lowercase.
    autor = models.CharField(db_column='Autor', max_length=45, blank=True, null=True)  # Field name made lowercase.
    data_publicacao = models.DateField(db_column='Data_Publicacao', blank=True, null=True)  # Field name made lowercase.
    genero = models.CharField(db_column='Genero', max_length=45, blank=True, null=True)  # Field name made lowercase.
    avaliacao = models.FloatField(db_column='Avaliacao', blank=True, null=True)  # Field name made lowercase.
    isbn = models.CharField(db_column='ISBN', max_length=20, blank=True, null=True)  # Field name made lowercase.
    categorias_id_categorias = models.ForeignKey('Categorias', models.DO_NOTHING, db_column='Categorias_Id_Categorias')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'livros'


class Categorias(models.Model):
    id_categorias = models.AutoField(db_column='Id_Categorias', primary_key=True)  # Field name made lowercase.
    nome_categoria = models.CharField(db_column='Nome_Categoria', max_length=45, blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'categorias'


class UsuariosHasLivros(models.Model):
    pk = models.CompositePrimaryKey('Usuarios_Id_Usuarios', 'Usuarios_Perfil_Id_Perfil', 'Livros_Id_Livros', 'Livros_Categorias_Id_Categorias')
    usuarios_id_usuarios = models.ForeignKey('Usuarios', models.DO_NOTHING, db_column='Usuarios_Id_Usuarios')  # Field name made lowercase.
    usuarios_perfil_id_perfil = models.ForeignKey('Usuarios', models.DO_NOTHING, db_column='Usuarios_Perfil_Id_Perfil', to_field='Perfil_Id_Perfil', related_name='usuarioshaslivros_usuarios_perfil_id_perfil_set')  # Field name made lowercase.
    livros_id_livros = models.ForeignKey(Livros, models.DO_NOTHING, db_column='Livros_Id_Livros')  # Field name made lowercase.
    livros_categorias_id_categorias = models.ForeignKey(Livros, models.DO_NOTHING, db_column='Livros_Categorias_Id_Categorias', to_field='Categorias_Id_Categorias', related_name='usuarioshaslivros_livros_categorias_id_categorias_set')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'usuarios_has_livros'
