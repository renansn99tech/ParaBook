# usuarios/models.py
from django.db import models
from django.contrib.auth.models import User
from perfis.models import Perfil
import uuid

class Usuario(models.Model):
    TIPO_USUARIO_CHOICES = [
        ('leitor', 'Leitor'),
        ('aguardando_aprovacao', 'Aguardando Aprovação de Autor'),
        ('autor', 'Autor Independente'),
        ('admin', 'Administrador'),
    ]
    
    # Ligação oficial com o sistema de autenticação do Django
    user_auth = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_customizado', null=True, blank=True)
    nome = models.CharField(max_length=45, blank=True, null=True)
    
    # REMOVIDO: email e senha (o Django já gerencia de forma segura em user_auth)
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_USUARIO_CHOICES,
        default='leitor'
    )
    notificacao_autor = models.BooleanField(default=False)
    notificacoes_email = models.BooleanField(default=True)
    notificacoes_comunidades = models.BooleanField(default=True)
    notificacoes_assinaturas = models.BooleanField(default=True)
    data_nascimento = models.CharField(max_length=45, blank=True, null=True)
    telefone = models.CharField(max_length=45, blank=True, null=True)
    foto = models.CharField(max_length=45, blank=True, null=True)
    descricao = models.CharField(max_length=45, blank=True, null=True)
    conquistas = models.CharField(max_length=45, blank=True, null=True)

    # NOVOS CAMPOS DE AUDITORIA (LGPD)
    termos_aceitos = models.BooleanField(default=False)
    data_aceite_termos = models.DateTimeField(null=True, blank=True)
    versao_termos_aceita = models.CharField(max_length=30, blank=True, default='')

    # Quantas vezes o lembrete "Termine seu cadastro" já foi exibido/dispensado.
    # Regra: 0 -> mostra logo após o cadastro; 1 -> mostra de novo só depois de
    # 1 semana; >= 2 -> nunca mais. Personalizar o perfil suprime o lembrete
    # antes de chegar ao teto (ver onboarding_perfil_pendente).
    onboarding_lembretes = models.PositiveSmallIntegerField(default=0)

    # Novo campo CPF para atender a LGPD, com validação de formato
    cpf = models.CharField(max_length=14, blank=True, null=True, unique=True)

    # Tornando o perfil opcional na criação física para evitar o erro de quem nasce primeiro (usuário > perfil || perfil > usuario)
    # Alterado: adicionado related_name para evitar o conflito com perfis.Perfil.usuario
    perfil = models.ForeignKey(
        Perfil, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='usuarios_vinculados' 
    )
    def onboarding_perfil_pendente(self):
        """Decide se o modal "Termine seu cadastro" deve aparecer para este usuário.

        Considera o perfil já personalizado (e portanto o lembrete resolvido) se
        a pessoa mexeu em qualquer um dos três campos: nome de exibição,
        localização ou frase de status. Caso contrário, respeita o teto de duas
        exibições: a primeira logo após o cadastro e a segunda só depois de uma
        semana do cadastro.
        """
        from datetime import timedelta
        from django.utils import timezone
        from perfis.models import FRASE_STATUS_PADRAO_LEITOR

        user_auth = self.user_auth
        if user_auth is None:
            return False

        perfil = getattr(user_auth, 'perfil', None)
        nome = (self.nome or '').strip()
        localizacao = (getattr(perfil, 'localizacao', '') or '').strip()
        frase = (getattr(perfil, 'descricao_perfil', '') or '').strip()

        personalizou = (
            (nome and nome != user_auth.username)
            or bool(localizacao)
            or (frase and frase != FRASE_STATUS_PADRAO_LEITOR)
        )
        if personalizou:
            return False

        lembretes = self.onboarding_lembretes or 0
        if lembretes == 0:
            return True
        if lembretes == 1:
            entrou_em = user_auth.date_joined
            return bool(entrou_em and timezone.now() >= entrou_em + timedelta(days=7))
        return False

    @property
    def is_premium(self):
        """Retorna True se o usuário possui uma assinatura ativa de plano pago."""
        if not hasattr(self.user_auth, 'assinatura'):
            return False
        assinatura = self.user_auth.assinatura
        return bool(assinatura.ativa and assinatura.plano and assinatura.plano.preco > 0)

    @property
    def limite_livros_estante(self):
        """Retorna o limite de livros permitido pelo plano atual do usuário."""
        if hasattr(self.user_auth, 'assinatura') and self.user_auth.assinatura.ativa and self.user_auth.assinatura.plano:
            return self.user_auth.assinatura.plano.limite_livros
        return 10

    def __str__(self):
        return self.nome or f"Usuario {self.id}"
    
# usuarios/models.py

class Notificacao(models.Model):
    class TipoNotificacao(models.TextChoices):
        ASSINATURA = 'ASSINATURA', 'Assinatura & Pagamentos'
        LIVRO = 'LIVRO', 'Novidades e Leitura'
        SISTEMA = 'SISTEMA', 'Avisos do Sistema'

    usuario = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notificacoes_sistema'
    )
    titulo = models.CharField(max_length=150)
    mensagem = models.TextField()
    tipo = models.CharField(
        max_length=20, 
        choices=TipoNotificacao.choices, 
        default=TipoNotificacao.SISTEMA
    )
    link_destino = models.CharField(max_length=255, blank=True, null=True) # Ex: '/assinaturas/planos/' ou URL
    lida = models.BooleanField(default=False, db_index=True)
    data_criacao = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notificacoes'
        ordering = ['-data_criacao']
        indexes = [
            models.Index(fields=['usuario', 'lida']), # Índice composto fundamental para velocidade
        ]

    def __str__(self):
        return f"[{self.tipo}] {self.titulo} - {self.usuario.username}"


class AuditoriaAcao(models.Model):
    ator = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    acao = models.CharField(max_length=80, db_index=True)
    recurso = models.CharField(max_length=120)
    recurso_id = models.CharField(max_length=64, blank=True)
    sucesso = models.BooleanField(default=True)
    metadados = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'auditoria_acoes'
        ordering = ['-criado_em']


class SessaoDispositivo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessoes_dispositivo')
    refresh_jti = models.CharField(max_length=255, unique=True)
    user_agent = models.CharField(max_length=255, blank=True)
    ip_hash = models.CharField(max_length=64, blank=True)
    criada_em = models.DateTimeField(auto_now_add=True)
    ultima_atividade_em = models.DateTimeField(auto_now=True)
    expira_em = models.DateTimeField()
    revogada_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'sessoes_dispositivo'
        ordering = ['-ultima_atividade_em']
        indexes = [models.Index(fields=['usuario', 'revogada_em'])]

    @property
    def ativa(self):
        from django.utils import timezone
        return self.revogada_em is None and self.expira_em > timezone.now()


class AutenticacaoDoisFatores(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='autenticacao_2fa')
    segredo_criptografado = models.TextField()
    habilitada = models.BooleanField(default=False)
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'autenticacao_dois_fatores'
