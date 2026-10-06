"""Prévia agregada de rollout; não inicializa estados nem converte datas legadas."""
import json
from collections import Counter
from datetime import datetime, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from usuarios.models import EstadoEtarioConta


class Command(BaseCommand):
    help = 'Simula um marco/versionamento etário somente em leitura, com contagens agregadas.'

    def add_arguments(self, parser):
        parser.add_argument('--marco', required=True, help='ISO 8601 com fuso horário explícito.')
        parser.add_argument('--versao', required=True)

    def handle(self, *args, **options):
        try:
            marco = datetime.fromisoformat(options['marco'].replace('Z', '+00:00'))
        except ValueError as exc:
            raise CommandError('Marco inválido.') from exc
        if timezone.is_naive(marco) or not options['versao'].strip():
            raise CommandError('Informe marco com fuso horário e versão não vazia.')
        agora = timezone.now()
        grupos, estados, papeis = Counter(), Counter(), Counter()
        for conta in User.objects.select_related('estado_etario', 'perfil_customizado').order_by('pk').iterator():
            if not conta.is_active:
                grupos['inativas_preservadas'] += 1
                continue
            antiga = conta.date_joined < marco
            grupos['preexistentes' if antiga else 'novas'] += 1
            estado = getattr(conta, 'estado_etario', None)
            situacao = estado.estado if estado else EstadoEtarioConta.Estado.PENDENTE
            estados[situacao] += 1
            perfil = getattr(conta, 'perfil_customizado', None)
            papeis['admin' if conta.is_superuser else perfil.tipo if perfil else 'sem_perfil'] += 1
            prazo = max(conta.date_joined, marco) + timedelta(days=7)
            restrita = situacao in {EstadoEtarioConta.Estado.RESTRITO_MENOR, EstadoEtarioConta.Estado.EM_REVISAO}
            restrita = restrita or (situacao == EstadoEtarioConta.Estado.PENDENTE and agora >= prazo)
            grupos['restritas_no_marco_simulado' if agora >= marco and restrita else 'sem_restricao_no_instante'] += 1
        self.stdout.write(json.dumps({
            'somente_leitura': True, 'versao_simulada': options['versao'],
            'marco_simulado': marco.isoformat(), 'consultado_em': agora.isoformat(),
            'contagens': dict(grupos), 'estados': dict(estados), 'papeis': dict(papeis),
            'observacao': 'Não altera flags, estados, eventos, date_joined ou dados legados. Não prova configuração hospedada.',
        }, ensure_ascii=False, sort_keys=True))
