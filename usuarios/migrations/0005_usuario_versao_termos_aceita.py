from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0004_auditoriaacao'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='versao_termos_aceita',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
    ]
