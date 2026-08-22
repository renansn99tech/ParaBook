from django.db import migrations, models
from django.db.models import F, Q


def preencher_datas_de_avaliacao(apps, schema_editor):
    Biblioteca = apps.get_model('biblioteca', 'Biblioteca')
    Biblioteca.objects.filter(
        Q(nota__isnull=False) | (Q(resenha__isnull=False) & ~Q(resenha='')),
        avaliada_em__isnull=True,
    ).update(avaliada_em=F('data_adicao'))


class Migration(migrations.Migration):
    dependencies = [
        ('biblioteca', '0007_preencher_datas_de_conclusao'),
    ]

    operations = [
        migrations.AddField(
            model_name='biblioteca',
            name='avaliada_em',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Última avaliação'),
        ),
        migrations.RunPython(preencher_datas_de_avaliacao, migrations.RunPython.noop),
    ]
