import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.db.models import F


def preencher_historico_minimo(apps, schema_editor):
    Biblioteca = apps.get_model('biblioteca', 'Biblioteca')
    EventoLeitura = apps.get_model('biblioteca', 'EventoLeitura')

    Biblioteca.objects.filter(
        favorito=True,
        favoritado_em__isnull=True,
    ).update(favoritado_em=F('data_adicao'))

    for item in Biblioteca.objects.filter(
        ultima_leitura_em__isnull=False,
    ).select_related('livro').iterator(chunk_size=500):
        total_paginas = item.livro.paginas or 0
        percentual = min(100, round((item.pagina_atual / total_paginas) * 100)) if total_paginas else 0
        evento = EventoLeitura.objects.create(
            livro_id=item.livro_id,
            usuario_id=item.user_id,
            sessao_id=uuid.uuid5(uuid.NAMESPACE_URL, f'parabook:backfill:{item.pk}'),
            pagina=item.pagina_atual,
            percentual=percentual,
            duracao_segundos=0,
            origem='backfill',
        )
        EventoLeitura.objects.filter(pk=evento.pk).update(criado_em=item.ultima_leitura_em)


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('biblioteca', '0008_biblioteca_avaliada_em'),
    ]

    operations = [
        migrations.AddField(
            model_name='biblioteca',
            name='favoritado_em',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Favoritado em'),
        ),
        migrations.CreateModel(
            name='EventoLeitura',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sessao_id', models.UUIDField(db_index=True, default=uuid.uuid4, verbose_name='Sessão de leitura')),
                ('pagina', models.PositiveIntegerField(default=0)),
                ('percentual', models.PositiveSmallIntegerField(default=0)),
                ('duracao_segundos', models.PositiveIntegerField(default=0)),
                ('origem', models.CharField(choices=[('real', 'Leitura real'), ('backfill', 'Dado anterior à telemetria')], default='real', max_length=12)),
                ('criado_em', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('livro', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='eventos_leitura', to='biblioteca.livro', verbose_name='Livro')),
                ('usuario', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='eventos_leitura', to=settings.AUTH_USER_MODEL, verbose_name='Leitor')),
            ],
            options={
                'db_table': 'eventos_leitura',
                'ordering': ['-criado_em'],
                'indexes': [
                    models.Index(fields=['livro', 'criado_em'], name='evento_livro_data_idx'),
                    models.Index(fields=['livro', 'pagina'], name='evento_livro_pag_idx'),
                    models.Index(fields=['usuario', 'sessao_id'], name='evento_user_sessao_idx'),
                ],
                'constraints': [
                    models.CheckConstraint(condition=models.Q(('percentual__gte', 0), ('percentual__lte', 100)), name='evento_percentual_0_100'),
                ],
            },
        ),
        migrations.RunPython(preencher_historico_minimo, migrations.RunPython.noop),
    ]
