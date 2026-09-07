import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('perfis', '0006_status_padrao_autor'),
    ]

    operations = [
        migrations.CreateModel(
            name='PerfilLegadoMigracao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('legado_id', models.PositiveBigIntegerField(unique=True)),
                ('legado_usuario_id', models.PositiveBigIntegerField(db_index=True)),
                ('perfil_criado', models.BooleanField(default=False)),
                ('campos_preenchidos', models.JSONField(blank=True, default=list)),
                ('conflitos', models.JSONField(blank=True, default=list)),
                ('valores_anteriores', models.JSONField(blank=True, default=dict)),
                ('hashes_migrados', models.JSONField(blank=True, default=dict)),
                ('snapshot_pos_migracao_hash', models.CharField(max_length=64)),
                ('status_legado', models.CharField(blank=True, max_length=20)),
                ('migrado_em', models.DateTimeField(auto_now_add=True)),
                ('perfil', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='migracao_legada_biblioteca', to='perfis.perfil')),
            ],
            options={
                'verbose_name': 'Proveniência de perfil legado',
                'verbose_name_plural': 'Proveniências de perfis legados',
                'db_table': 'perfis_migracao_legado_biblioteca',
            },
        ),
    ]
