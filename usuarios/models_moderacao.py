"""Protocolos G3: dados de atendimento segregados e decisões rastreáveis."""
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class CalendarioModeracao(models.Model):
    inicio = models.DateField()
    fim = models.DateField()
    feriados = models.JSONField(default=list)
    referencia = models.CharField(max_length=200)
    conferido_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    conferido_em = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(fim__gte=models.F('inicio')), name='moderacao_calendario_intervalo')]


class CasoModeracao(models.Model):
    ESTADOS = [('aguarda_triagem', 'Aguarda triagem'), ('em_analise', 'Em análise'),
               ('aguarda_complemento', 'Aguarda complemento'), ('decidido', 'Decidido'), ('encerrado', 'Encerrado')]
    ORIGENS = [(valor, valor) for valor in ('publica', 'obra', 'comunidade', 'suporte', 'suspensao', 'recurso', 'conselho')]
    protocolo = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    origem = models.CharField(max_length=16, choices=ORIGENS)
    origem_id = models.PositiveBigIntegerField(null=True)
    chave_entrada = models.UUIDField(null=True, unique=True)
    acesso_digest = models.CharField(max_length=64, blank=True)
    categoria = models.CharField(max_length=40)
    dados_cifrados = models.TextField(blank=True)
    chave_id = models.CharField(max_length=40, blank=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='casos_proprios')
    alvo_usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='casos_recebidos')
    alvo_livro = models.ForeignKey('biblioteca.Livro', null=True, on_delete=models.SET_NULL, related_name='casos_moderacao')
    alvo_comunidade = models.ForeignKey('comunidades.Comunidade', null=True, on_delete=models.SET_NULL, related_name='casos_moderacao')
    suspensao = models.OneToOneField('usuarios.SuspensaoConta', null=True, on_delete=models.SET_NULL, related_name='caso_moderacao')
    prioridade = models.CharField(max_length=2, blank=True, choices=[(p, p) for p in ('P0', 'P1', 'P2')])
    estado = models.CharField(max_length=24, choices=ESTADOS, default='aguarda_triagem', db_index=True)
    responsavel = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='casos_assumidos')
    decisor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='casos_decididos')
    calendario = models.ForeignKey(CalendarioModeracao, null=True, on_delete=models.SET_NULL)
    recebido_em = models.DateTimeField(default=timezone.now, db_index=True)
    confirmado_em = models.DateTimeField(null=True)
    triado_em = models.DateTimeField(null=True)
    confirmacao_humana_ate = models.DateTimeField(null=True)
    triagem_ate = models.DateTimeField(null=True)
    decisao_ate = models.DateTimeField(null=True)
    decidido_em = models.DateTimeField(null=True)
    comunicado_em = models.DateTimeField(null=True)
    encerrado_em = models.DateTimeField(null=True)
    regra = models.CharField(max_length=200, blank=True)
    evidencia_ref = models.CharField(max_length=200, blank=True)
    medida = models.CharField(max_length=32, blank=True)
    resposta_publica = models.TextField(max_length=4000, blank=True)
    retorno_estado = models.CharField(max_length=16, default='pendente', choices=[('pendente', 'Pendente'), ('disponivel', 'Disponível no protocolo'), ('consultado', 'Consultado')])
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['recebido_em', 'pk']
        permissions = [('operar_risco_grave', 'Operar P0/P1, suspensão e recursos de moderação')]
        constraints = [models.UniqueConstraint(fields=['origem', 'origem_id'], condition=Q(origem_id__isnull=False), name='moderacao_origem_unica')]


class EventoModeracao(models.Model):
    caso = models.ForeignKey(CasoModeracao, on_delete=models.CASCADE, related_name='eventos')
    chave = models.UUIDField(default=uuid.uuid4, unique=True)
    ator = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    acao = models.CharField(max_length=40)
    criado_em = models.DateTimeField(default=timezone.now)
    dados_cifrados = models.TextField(blank=True)
    chave_id = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ['pk']

    def save(self, *args, **kwargs):
        if self.pk:
            raise RuntimeError('Eventos de moderação são imutáveis.')
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError('Eventos de moderação exigem o executor restrito de retenção.')


class RecursoModeracao(models.Model):
    caso = models.OneToOneField(CasoModeracao, on_delete=models.PROTECT, related_name='recurso')
    atendimento = models.OneToOneField(CasoModeracao, on_delete=models.PROTECT, related_name='recurso_atendido')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    chave = models.UUIDField(unique=True)
    estado = models.CharField(max_length=12, choices=[('pendente', 'Pendente'), ('acolhido', 'Acolhido'), ('recusado', 'Recusado')], default='pendente')
    criado_em = models.DateTimeField(default=timezone.now)
    decidido_em = models.DateTimeField(null=True)


class PedidoConselho(models.Model):
    caso = models.ForeignKey(CasoModeracao, on_delete=models.PROTECT, related_name='pedidos_conselho')
    protocolo = models.UUIDField(default=uuid.uuid4, unique=True)
    chave = models.UUIDField(unique=True)
    solicitante = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    acao = models.CharField(max_length=16, choices=[('remover', 'Remover definitivamente'), ('restaurar', 'Restaurar excepcionalmente')])
    recurso = models.CharField(max_length=100)
    recurso_id = models.PositiveBigIntegerField()
    snapshot = models.CharField(max_length=64)
    estado = models.CharField(max_length=12, choices=[('pendente', 'Pendente'), ('executado', 'Executado'), ('cancelado', 'Cancelado')], default='pendente')
    criado_em = models.DateTimeField(default=timezone.now)
    executado_em = models.DateTimeField(null=True)
    resultado_ref = models.CharField(max_length=100, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['recurso', 'recurso_id'], condition=Q(estado='pendente'), name='conselho_um_pedido_pendente')]


class AprovacaoConselho(models.Model):
    pedido = models.ForeignKey(PedidoConselho, on_delete=models.CASCADE, related_name='aprovacoes')
    aprovador = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    snapshot = models.CharField(max_length=64)
    criada_em = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['pedido', 'aprovador'], name='conselho_aprovador_distinto')]


class ImpedimentoModeracao(models.Model):
    """Causa restrita real; abertura não pode ser apagada pelo painel de moderação."""
    recurso = models.CharField(max_length=100)
    recurso_id = models.PositiveBigIntegerField()
    causa = models.CharField(max_length=24, choices=[(c, c) for c in ('retencao', 'incidente', 'ordem_autoridade', 'preservacao')])
    referencia = models.CharField(max_length=200)
    criada_em = models.DateTimeField(default=timezone.now)
    liberada_em = models.DateTimeField(null=True)


class LimiteModeracao(models.Model):
    """Contador compartilhado no PostgreSQL, sem IP claro ou conteúdo de pedido."""
    chave = models.CharField(max_length=64, primary_key=True)
    janela = models.DateTimeField(db_index=True)
    tentativas = models.PositiveIntegerField(default=0)
