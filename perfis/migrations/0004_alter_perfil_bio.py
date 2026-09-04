from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('perfis', '0003_perfil_tipografia'),
    ]

    operations = [
        migrations.AlterField(
            model_name='perfil',
            name='bio',
            field=models.TextField(blank=True, max_length=800, null=True),
        ),
    ]
