"""Controles locais H/I/X; não envia mensagens nem concede permissões.

Fichas reais ficam na custódia fora do repositório. Protocolos/referências,
estados e datas permitem fechamento parcial sem declarar expurgo/revogação.
"""
from dataclasses import dataclass
from datetime import timedelta
import re

ESTADOS = {'nao_aplicavel', 'pendente', 'em_andamento', 'concluido', 'preservado', 'impedido'}
PROTOCOLO = re.compile(r'^PB-(LGPD|INC|ACE)-\d{4}-\d{3,}$')


def validar_protocolo(protocolo):
    if not isinstance(protocolo, str) or not PROTOCOLO.fullmatch(protocolo):
        raise ValueError('Use protocolo sem nome ou dado pessoal no identificador.')


@dataclass(frozen=True)
class EtapaDestino:
    destino: str
    estado: str
    motivo_codigo: str = ''
    evidencia_ref: str = ''
    proxima_acao: str = ''
    revisar_em: object = None
    essencial: bool = True

    def validar(self):
        if self.estado not in ESTADOS:
            raise ValueError('Estado por destino inválido.')
        if self.estado == 'concluido' and not self.evidencia_ref:
            raise ValueError('Conclusão exige referência de evidência.')
        if self.estado in {'nao_aplicavel', 'preservado', 'impedido'} and not self.motivo_codigo:
            raise ValueError('Este estado exige motivo específico.')
        if self.estado in {'pendente', 'em_andamento', 'preservado', 'impedido'}:
            if not self.proxima_acao or self.revisar_em is None:
                raise ValueError('Etapa residual exige próxima ação e data de revisão.')


def fechamento(etapas):
    if not etapas:
        raise ValueError('Confira os destinos antes do fechamento.')
    for etapa in etapas:
        etapa.validar()
    residual = [e.destino for e in etapas if e.estado not in {'concluido', 'nao_aplicavel'}]
    return {'estado': 'parcial' if residual else 'concluido', 'destinos_residuais': residual}


@dataclass(frozen=True)
class AcessoExcepcional:
    protocolo: str
    inicio: object
    fim: object
    ambiente: str
    recurso: str
    operacoes: tuple
    anterior: str = ''
    emergencia: bool = False

    def validar(self):
        validar_protocolo(self.protocolo)
        if not self.protocolo.startswith('PB-ACE-'):
            raise ValueError('O acesso exige protocolo ACE.')
        if self.inicio.utcoffset() is None or self.fim.utcoffset() is None:
            raise ValueError('A linha do tempo exige fuso explícito.')
        if not timedelta(0) < self.fim - self.inicio <= timedelta(hours=2):
            raise ValueError('A janela deve ter até duas horas.')
        if self.ambiente not in {'local_sintetico', 'staging', 'producao'} or not self.recurso or not self.operacoes:
            raise ValueError('Declare ambiente, recurso e operações mínimas.')
        if any(op not in {'consultar', 'corrigir', 'exportar', 'conter', 'descartar'} for op in self.operacoes):
            raise ValueError('Operação fora do catálogo permitido.')
        if self.anterior:
            validar_protocolo(self.anterior)
            if self.anterior == self.protocolo:
                raise ValueError('Renovação exige novo protocolo vinculado.')

    def conferir_operacao(self, *, agora, ambiente, recurso, operacao):
        self.validar()
        if not self.inicio <= agora < self.fim:
            raise ValueError('Janela encerrada ou ainda não iniciada.')
        if ambiente != self.ambiente or recurso != self.recurso or operacao not in self.operacoes:
            raise ValueError('Interrompa a operação fora do escopo autorizado.')

    @property
    def revisar_em(self):
        return self.inicio + timedelta(hours=24) if self.emergencia else self.fim


def prazo_dias_uteis(inicio, quantidade, *, feriados=(), calendario_conferido=False):
    if not calendario_conferido:
        raise ValueError('Confira o calendário aplicável antes de confirmar o prazo.')
    if type(quantidade) is not int or quantidade <= 0:
        raise ValueError('Informe uma quantidade positiva de dias úteis.')
    atual = inicio.date()
    restantes = quantidade
    while restantes:
        atual += timedelta(days=1)
        if atual.weekday() < 5 and atual not in feriados:
            restantes -= 1
    return atual


@dataclass(frozen=True)
class IncidentePrivacidade:
    protocolo: str
    criado_em: object
    conhecimento_dados_afetados_em: object = None
    exposicao_ativa: bool = False
    classificacao: str = 'alerta'
    impacto: str = 'desconhecido'
    decisao_comunicar: str = 'pendente'

    def validar(self):
        validar_protocolo(self.protocolo)
        if not self.protocolo.startswith('PB-INC-'):
            raise ValueError('O incidente exige protocolo INC.')
        if self.classificacao not in {'alerta', 'incidente_confirmado', 'sem_dados_pessoais'}:
            raise ValueError('Classificação inválida.')
        if self.impacto not in {'baixo', 'medio', 'alto', 'desconhecido'}:
            raise ValueError('Impacto inválido.')
        if self.decisao_comunicar not in {'pendente', 'comunicar', 'nao_comunicar_justificado'}:
            raise ValueError('Decisão inválida.')
        if self.classificacao == 'incidente_confirmado' and self.conhecimento_dados_afetados_em is None:
            raise ValueError('O conhecimento de dados afetados precisa ser registrado.')

    @property
    def triagem_ate(self):
        return self.criado_em if self.exposicao_ativa else self.criado_em + timedelta(hours=24)

    def comunicacao_ate(self, **calendario):
        self.validar()
        if self.conhecimento_dados_afetados_em is None:
            return None
        return prazo_dias_uteis(self.conhecimento_dados_afetados_em, 3, **calendario)

    def complemento_ate(self, comunicado_em, **calendario):
        self.validar()
        return prazo_dias_uteis(comunicado_em, 20, **calendario)

    @property
    def registro_ate(self):
        from usuarios.retencao import limite_retencao
        return limite_retencao('INCIDENTE', self.criado_em)


def checklist_ausencia(*, casos, controlador_disponivel, agora):
    for caso in casos:
        validar_protocolo(caso['protocolo'])
        if not caso.get('proxima_acao') or caso.get('prazo') is None:
            raise ValueError('Caso aberto exige prazo e próxima ação.')
    em_risco = [c['protocolo'] for c in casos if c['prazo'] <= agora + timedelta(hours=24)]
    return {'controlador_disponivel': controlador_disponivel, 'prazos_em_risco': em_risco,
            'delegacao_automatica': False, 'continuidade_independente_comprovada': False}
