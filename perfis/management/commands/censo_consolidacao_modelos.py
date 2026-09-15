import json
from collections import Counter
from urllib.parse import urlsplit

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

from biblioteca.models import Perfil as PerfilLegado
from notificacoes.models import Notificacao, NotificacaoLegadaMigracao
from perfis.models import Perfil, PerfilLegadoMigracao
from usuarios.models import Notificacao as NotificacaoLegada


def link_interno_seguro(link):
    if not link:
        return True
    link = link.strip()
    if not link or '\\' in link or any(ord(caractere) < 32 for caractere in link):
        return False
    try:
        partes = urlsplit(link)
    except ValueError:
        return False
    return (
        not partes.scheme
        and not partes.netloc
        and partes.path.startswith('/')
        and not partes.path.startswith('//')
    )


class Command(BaseCommand):
    help = (
        'Produz censo agregado e somente leitura dos modelos duplicados, '
        'sem imprimir conteúdo pessoal.'
    )

    def handle(self, *args, **options):
        canonicos_por_usuario = {
            perfil.usuario_id: perfil
            for perfil in Perfil.objects.exclude(usuario_id=None).only(
                'usuario_id', 'foto', 'bio', 'localizacao'
            )
        }
        conflitos = Counter()
        sobreposicoes = 0
        for legado in PerfilLegado.objects.only(
            'user_id', 'foto', 'bio', 'localizacao'
        ).iterator(chunk_size=500):
            canonico = canonicos_por_usuario.get(legado.user_id)
            if canonico is None:
                continue
            sobreposicoes += 1
            for campo in ('foto', 'bio', 'localizacao'):
                valor_canonico = getattr(canonico, campo)
                valor_legado = getattr(legado, campo)
                valor_canonico = valor_canonico.name if hasattr(valor_canonico, 'name') else valor_canonico
                valor_legado = valor_legado.name if hasattr(valor_legado, 'name') else valor_legado
                if valor_canonico not in (None, '') and valor_legado not in (None, '') and valor_canonico != valor_legado:
                    conflitos[campo] += 1

        tipos_legados = Counter(
            NotificacaoLegada.objects.values_list('tipo', flat=True).iterator(chunk_size=500)
        )
        links_rejeitados = sum(
            1
            for link in NotificacaoLegada.objects.values_list(
                'link_destino', flat=True
            ).iterator(chunk_size=500)
            if not link_interno_seguro(link)
        )
        migration_0011_aplicada = MigrationRecorder.Migration.objects.filter(
            app='biblioteca',
            name='0011_denuncia_decisao_denuncia_evidencias_and_more',
        ).exists()

        resultado = {
            'biblioteca_0011_aplicada': migration_0011_aplicada,
            'notificacoes': {
                'canonicas': Notificacao.objects.count(),
                'legadas': NotificacaoLegada.objects.count(),
                'legadas_links_rejeitados': links_rejeitados,
                'legadas_por_tipo': dict(sorted(tipos_legados.items())),
            },
            'perfis': {
                'canonicos': Perfil.objects.count(),
                'canonicos_orfaos': Perfil.objects.filter(usuario_id=None).count(),
                'conflitos_por_campo': dict(sorted(conflitos.items())),
                'legados': PerfilLegado.objects.count(),
                'sobreposicoes_por_usuario': sobreposicoes,
            },
        }
        tabelas = set(connection.introspection.table_names())
        if PerfilLegadoMigracao._meta.db_table in tabelas:
            resultado['proveniencias'] = {
                'perfis': PerfilLegadoMigracao.objects.count(),
                'perfis_legados_sem_proveniencia': PerfilLegado.objects.exclude(
                    pk__in=PerfilLegadoMigracao.objects.values('legado_id')
                ).count(),
            }
        if NotificacaoLegadaMigracao._meta.db_table in tabelas:
            resultado.setdefault('proveniencias', {}).update({
                'notificacoes': NotificacaoLegadaMigracao.objects.count(),
                'notificacoes_legadas_sem_proveniencia': NotificacaoLegada.objects.exclude(
                    pk__in=NotificacaoLegadaMigracao.objects.values('legado_id')
                ).count(),
            })
        self.stdout.write(json.dumps(resultado, ensure_ascii=False, sort_keys=True))
