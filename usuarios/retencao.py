"""Políticas R/K: cálculo sem I/O e sem reiniciar prazo ao liberar preservação."""
from datetime import timedelta

DIAS = {'R01': 30, 'R02': 30, 'R03': 30, 'R04': 90, 'R05': 180, 'R06': 30,
        'R07': 90, 'EXPORT': 7, 'BACKUP_DIARIO': 7, 'BACKUP_SEMANAL': 30,
        'R12': 30, 'R13': 90}
ANOS = {'R08': 2, 'R09': 5, 'R10': 2, 'R14': 1, 'INCIDENTE': 5}
DESTINOS = {'banco', 'storage', 'gmail', 'logs', 'copias', 'exportacao', 'provas'}


def adicionar_anos(instante, anos):
    try:
        return instante.replace(year=instante.year + anos)
    except ValueError:
        return instante.replace(year=instante.year + anos, day=28)


def limite_retencao(classe, evento_em):
    if evento_em is None:
        return None
    if classe in ANOS:
        return adicionar_anos(evento_em, ANOS[classe])
    if classe in DIAS:
        return evento_em + timedelta(days=DIAS[classe])
    raise ValueError('Classe de retenção não reconhecida.')


def avaliar_destino(*, classe, evento_em, agora, preservacoes=(), condicoes=()):
    limite = limite_retencao(classe, evento_em)
    if limite is None:
        return {'estado': 'impedido', 'motivo_codigo': 'evento_desconhecido', 'limite_em': None}
    if evento_em > agora:
        return {'estado': 'impedido', 'motivo_codigo': 'evento_futuro', 'limite_em': limite}
    if any(p.liberada_em is None for p in preservacoes):
        return {'estado': 'preservado', 'motivo_codigo': 'causa_ativa', 'limite_em': limite}
    if any(condicao is not True for condicao in condicoes):
        return {'estado': 'impedido', 'motivo_codigo': 'condicao_nao_comprovada', 'limite_em': limite}
    return {'estado': 'elegivel' if agora >= limite else 'pendente', 'motivo_codigo': '', 'limite_em': limite}
