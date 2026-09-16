from django.db import migrations, models


def ocultar_categoria_infantis(apps, schema_editor):
    Categoria = apps.get_model('biblioteca', 'Categoria')
    Categoria.objects.filter(nome__iexact='Infantis').update(disponivel_publicamente=False)


class Migration(migrations.Migration):
    dependencies = [('biblioteca', '0011_denuncia_decisao_denuncia_evidencias_and_more')]

    operations = [
        migrations.AddField(
            model_name='categoria',
            name='disponivel_publicamente',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(ocultar_categoria_infantis, migrations.RunPython.noop),
    ]
