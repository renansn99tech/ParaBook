"""Fila e relógio G3 para operação manual. Não envia retorno nem aplica medidas.

Calendário explícito e confirmado por intervalo; nenhuma biblioteca/serviço
externo presume feriados. Fichas reais seguem custódia, fora do Git.
"""
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo


BRASILIA = ZoneInfo('America/Sao_Paulo')
PRIORIDADES = {'P0': (0, 7), 'P1': (1, 7), 'P2': (3, 15)}


@dataclass(frozen=True)
class CalendarioAtendimento:
    inicio: date
    fim: date
    feriados: frozenset[date]
    referencia: str

    def janela(self, dia):
        if not self.referencia or not self.inicio <= dia <= self.fim:
            raise ValueError('Calendário não conferido para este intervalo.')
        if dia.weekday() == 6 or dia in self.feriados:
            return None
        abre, fecha = (time(10), time(15)) if dia.weekday() == 5 else (time(9), time(18))
        return datetime.combine(dia, abre, BRASILIA), datetime.combine(dia, fecha, BRASILIA)

    def proximo_instante(self, instante):
        if instante.tzinfo is None:
            raise ValueError('Instante exige fuso horário.')
        instante = instante.astimezone(BRASILIA)
        while True:
            janela = self.janela(instante.date())
            if janela and instante < janela[1]:
                return max(instante, janela[0])
            instante = datetime.combine(instante.date() + timedelta(days=1), time.min, BRASILIA)

    def somar_horas(self, instante, horas):
        restante = timedelta(hours=horas)
        instante = self.proximo_instante(instante)
        while restante:
            _, fecha = self.janela(instante.date())
            duracao = min(restante, fecha - instante)
            restante -= duracao
            instante += duracao
            if restante:
                instante = self.proximo_instante(instante)
        return instante

    def somar_dias(self, instante, dias):
        instante = self.proximo_instante(instante)
        dia, horario = instante.date(), instante.timetz().replace(tzinfo=None)
        for _ in range(dias):
            dia += timedelta(days=1)
            while not self.janela(dia):
                dia += timedelta(days=1)
        abre, fecha = self.janela(dia)
        return min(max(datetime.combine(dia, horario, BRASILIA), abre), fecha)


def prazos_caso(*, recebido_em, prioridade, calendario):
    if prioridade not in PRIORIDADES:
        raise ValueError('Classifique em P0, P1 ou P2; não há P3.')
    resposta_dias, decisao_dias = PRIORIDADES[prioridade]
    triagem = (calendario.somar_horas(recebido_em, 6) if prioridade == 'P0'
               else calendario.somar_dias(recebido_em, resposta_dias))
    return {'confirmacao_humana_ate': triagem, 'triagem_ate': triagem,
            'decisao_ate': calendario.somar_dias(recebido_em, decisao_dias)}


def fila_pendente():
    """Somente leitura, referências mínimas; ausência de triagem permanece explícita."""
    from biblioteca.models import Denuncia
    from comunidades.models import DenunciaComunidade
    from usuarios.models import SolicitacaoSuporte
    fontes = [
        ('obra', Denuncia.objects.filter(status='pendente', arquivada=False), 'data_denuncia'),
        ('comunidade', DenunciaComunidade.objects.filter(status='pendente'), 'data_denuncia'),
        ('suporte', SolicitacaoSuporte.objects.filter(status__in=['aberta', 'em_analise']), 'criada_em'),
    ]
    itens = []
    for origem, consulta, campo_data in fontes:
        for registro in consulta.order_by('pk').iterator():
            itens.append({'referencia': f'{origem}:{registro.pk}',
                         'protocolo_origem': str(getattr(registro, 'protocolo', '') or ''),
                         'recebido_em': getattr(registro, campo_data), 'prioridade': None,
                         'responsavel': None, 'estado': 'aguarda_triagem'})
    return sorted(itens, key=lambda item: (item['recebido_em'], item['referencia']))


def validar_ficha(ficha):
    """Valida evidência manual sem converter plano em execução comprovada."""
    if ficha.get('prioridade') not in PRIORIDADES or not ficha.get('protocolo'):
        raise ValueError('Protocolo e prioridade são obrigatórios.')
    if not ficha.get('responsavel'):
        raise ValueError('Caso exige responsável expresso; ausência não nomeia substituto.')
    if ficha.get('decidido_em'):
        if not ficha.get('triado_em') or not ficha.get('regra') or not ficha.get('decisao_ref'):
            raise ValueError('Decisão exige triagem, regra e referência mínima de evidência.')
        if ficha['decidido_em'] < ficha['triado_em']:
            raise ValueError('Decisão anterior à triagem.')
    if ficha.get('comunicado_em') and (not ficha.get('decidido_em') or not ficha.get('recibo_ref')):
        raise ValueError('Comunicação efetiva exige decisão e recibo/referência de entrega.')
    if ficha.get('recurso_tipo') and ficha['recurso_tipo'] not in {'suspensao_conta', 'remocao_definitiva'}:
        raise ValueError('Recurso transversal fora do escopo aprovado; publicação conserva seu rito próprio.')
    if ficha.get('exclusao_definitiva'):
        raise ValueError('Ficha não executa exclusão definitiva. Encaminhe ao rito do Conselho.')
    return True


def conferir_conselho(*, aprovacoes, reautenticadas, travas):
    """Conferência preparatória; nunca realiza exclusão ou contorna retenção."""
    if len(set(aprovacoes)) != 2 or len(aprovacoes) != 2:
        raise ValueError('Conselho exige duas aprovações distintas; não presumir disponibilidade.')
    obrigatorias = {'retencao', 'recurso', 'incidente', 'ordem_autoridade', 'preservacao'}
    if (set(reautenticadas) != set(aprovacoes) or set(travas) != obrigatorias
            or any(valor is not False for valor in travas.values())):
        raise ValueError('Reautenticação ou travas de retenção/recurso/incidente não resolvidas.')
    return {'estado': 'pronto_para_revalidacao', 'executado': False}
