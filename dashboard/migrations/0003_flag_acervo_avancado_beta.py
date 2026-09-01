from django.db import migrations


def criar_flag_acervo_avancado_beta(apps, schema_editor):
    FeatureFlag = apps.get_model('dashboard', 'FeatureFlag')
    FeatureFlag.objects.update_or_create(
        chave='acervo_avancado_beta',
        defaults={
            'descricao': (
                'Ativa coleções editoriais, ofertas experimentais e '
                'simulações de apoio e compra na Biblioteca.'
            ),
            'habilitada': False,
            'disponivel': True,
        },
    )


def remover_flag_acervo_avancado_beta(apps, schema_editor):
    FeatureFlag = apps.get_model('dashboard', 'FeatureFlag')
    FeatureFlag.objects.filter(chave='acervo_avancado_beta').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('dashboard', '0002_featureflag_disponivel_e_novas_flags'),
    ]

    operations = [
        migrations.RunPython(
            criar_flag_acervo_avancado_beta,
            remover_flag_acervo_avancado_beta,
        ),
    ]
