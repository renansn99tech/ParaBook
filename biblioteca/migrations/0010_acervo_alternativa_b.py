from django.db import migrations, models


def converter_categoria_independentes_em_origem(apps, schema_editor):
    Categoria = apps.get_model('biblioteca', 'Categoria')
    Livro = apps.get_model('biblioteca', 'Livro')
    categoria_antiga = Categoria.objects.filter(nome__iexact='Independentes').first()
    if not categoria_antiga:
        return

    livros_antigos = Livro.objects.filter(categoria_id=categoria_antiga.pk)
    if livros_antigos.exists():
        categoria_pendente, _ = Categoria.objects.get_or_create(nome='A classificar')
        livros_antigos.update(
            origem='autor_independente',
            categoria_id=categoria_pendente.pk,
        )
    categoria_antiga.delete()


class Migration(migrations.Migration):
    dependencies = [
        ('biblioteca', '0009_eventoleitura_biblioteca_favoritado_em'),
    ]

    operations = [
        migrations.AlterField(
            model_name='livro',
            name='origem',
            field=models.CharField(
                choices=[
                    ('dominio_publico', 'Domínio Público'),
                    ('autor_independente', 'Autor Independente'),
                    ('licenciado', 'Acervo Licenciado'),
                ],
                default='dominio_publico',
                max_length=25,
                verbose_name='Origem da Obra',
            ),
        ),
        migrations.AddField(
            model_name='livro',
            name='modelo_acesso',
            field=models.CharField(
                choices=[
                    ('gratuito', 'Leitura gratuita'),
                    ('assinante', 'Incluído na assinatura'),
                    ('amostra', 'Somente amostra'),
                ],
                db_index=True,
                default='gratuito',
                max_length=12,
                verbose_name='Modelo de acesso',
            ),
        ),
        migrations.AddField(
            model_name='livro',
            name='pdf_amostra',
            field=models.FileField(blank=True, null=True, upload_to='livros/amostras/', verbose_name='PDF da amostra'),
        ),
        migrations.AddField(
            model_name='livro',
            name='disponivel_de',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Disponível a partir de'),
        ),
        migrations.AddField(
            model_name='livro',
            name='disponivel_ate',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Disponível até'),
        ),
        migrations.AddField(
            model_name='livro',
            name='territorio_cultural',
            field=models.CharField(
                blank=True,
                help_text='Identificação editorial voluntária, como Belém/PA ou Amazônia.',
                max_length=120,
                verbose_name='Território cultural',
            ),
        ),
        migrations.RunPython(
            converter_categoria_independentes_em_origem,
            migrations.RunPython.noop,
        ),
    ]
