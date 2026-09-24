from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError


def impedir_reversao_destrutiva(apps, schema_editor):
    Comunidade = apps.get_model('comunidades', 'Comunidade')
    if Comunidade.objects.using(schema_editor.connection.alias).filter(
        chave_demonstrativa__isnull=False,
    ).exists():
        raise IrreversibleError(
            'Há comunidades demonstrativas. Desative a feature flag em vez de '
            'apagar a coluna de proveniência.'
        )


class Migration(migrations.Migration):
    dependencies = [('comunidades', '0003_respostapostagem')]

    operations = [
        migrations.AddField(
            model_name='comunidade',
            name='chave_demonstrativa',
            field=models.CharField(
                blank=True, editable=False, max_length=80, null=True, unique=True,
            ),
        ),
        migrations.RunPython(migrations.RunPython.noop, impedir_reversao_destrutiva),
    ]
