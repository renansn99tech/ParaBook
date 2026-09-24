from django.db import migrations


def criar_flag_conteudo_demonstrativo(apps, schema_editor):
    FeatureFlag = apps.get_model('dashboard', 'FeatureFlag')
    FeatureFlag.objects.using(schema_editor.connection.alias).get_or_create(
        chave='conteudo_demonstrativo',
        defaults={
            'descricao': (
                'Mostra fichas de livros e comunidades demonstrativas, sem arquivos '
                'ou participação. Desativar oculta os exemplos sem excluir dados.'
            ),
            'habilitada': True,
            'disponivel': True,
        },
    )


class Migration(migrations.Migration):
    dependencies = [('dashboard', '0003_flag_acervo_avancado_beta')]

    operations = [
        migrations.RunPython(
            criar_flag_conteudo_demonstrativo,
            migrations.RunPython.noop,
        ),
    ]
