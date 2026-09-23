from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError


def impedir_reversao_destrutiva(apps, schema_editor):
    Livro = apps.get_model('biblioteca', 'Livro')
    if Livro.objects.using(schema_editor.connection.alias).filter(
        chave_demonstrativa__isnull=False,
    ).exists():
        raise IrreversibleError(
            'Há fichas demonstrativas. Desative a feature flag em vez de apagar '
            'a coluna de proveniência.'
        )


class Migration(migrations.Migration):
    dependencies = [('biblioteca', '0012_categoria_disponibilidade_publica')]

    operations = [
        migrations.AddField(
            model_name='livro',
            name='chave_demonstrativa',
            field=models.CharField(
                blank=True, editable=False, max_length=80, null=True, unique=True,
            ),
        ),
        migrations.RunPython(migrations.RunPython.noop, impedir_reversao_destrutiva),
    ]
