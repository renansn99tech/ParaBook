from django.db import migrations, models


def configurar_flags(apps, schema_editor):
    FeatureFlag = apps.get_model('dashboard', 'FeatureFlag')
    FeatureFlag.objects.filter(chave='autenticacao_2fa').update(
        habilitada=False,
        disponivel=False,
        descricao='Disponibilizará verificação em duas etapas por aplicativo autenticador.',
    )
    FeatureFlag.objects.update_or_create(
        chave='banner_anuncios',
        defaults={
            'descricao': 'Exibe o banner global de anúncios e o atalho para o plano Premium.',
            'habilitada': False,
            'disponivel': True,
        },
    )
    FeatureFlag.objects.update_or_create(
        chave='analytics_autor',
        defaults={
            'descricao': 'Disponibilizará métricas de alcance, leitura e engajamento para autores.',
            'habilitada': False,
            'disponivel': False,
        },
    )


def reverter_flags(apps, schema_editor):
    FeatureFlag = apps.get_model('dashboard', 'FeatureFlag')
    FeatureFlag.objects.filter(chave__in=['banner_anuncios', 'analytics_autor']).delete()
    FeatureFlag.objects.filter(chave='autenticacao_2fa').update(
        habilitada=True,
        disponivel=True,
        descricao='Disponibiliza verificação em duas etapas por aplicativo autenticador.',
    )


class Migration(migrations.Migration):
    dependencies = [
        ('dashboard', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='featureflag',
            name='disponivel',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(configurar_flags, reverter_flags),
    ]
