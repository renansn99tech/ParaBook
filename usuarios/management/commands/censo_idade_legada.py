"""Censo agregado e somente leitura do campo legado de nascimento."""

import json
from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from usuarios.models import Usuario


FORMATOS = {
    '%Y-%m-%d': 'iso',
    '%d/%m/%Y': 'dia_mes_ano_barra',
    '%d-%m-%Y': 'dia_mes_ano_hifen',
}


def classificar(valor, *, hoje):
    valor = (valor or '').strip()
    if not valor:
        return 'ausente'
    for formato, rotulo in FORMATOS.items():
        try:
            data = datetime.strptime(valor, formato).date()
        except ValueError:
            continue
        if data > hoje:
            return 'futuro'
        if hoje.year - data.year > 130:
            return 'fora_da_faixa'
        return rotulo
    return 'invalido'


class Command(BaseCommand):
    help = 'Gera censo agregado e somente leitura de Usuario.data_nascimento legado.'

    def handle(self, *args, **options):
        resultado = {
            'campo': 'usuarios_usuario.data_nascimento',
            'executado_em_utc': timezone.now().isoformat(),
            'total_contas_com_registro': 0,
            'formatos': {
                'ausente': 0,
                'iso': 0,
                'dia_mes_ano_barra': 0,
                'dia_mes_ano_hifen': 0,
                'futuro': 0,
                'fora_da_faixa': 0,
                'invalido': 0,
            },
            'observacao': (
                'Censo agregado: não converte, não atualiza e não exibe valores, contas ou dados pessoais.'
            ),
        }
        hoje = timezone.localdate()
        for valor in Usuario.objects.order_by('pk').values_list('data_nascimento', flat=True).iterator():
            resultado['total_contas_com_registro'] += 1
            resultado['formatos'][classificar(valor, hoje=hoje)] += 1
        self.stdout.write(json.dumps(resultado, ensure_ascii=False, sort_keys=True))
