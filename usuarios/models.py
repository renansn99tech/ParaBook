# usuarios/models.py
from django.db import models
from django.contrib.auth.models import User
from perfis.models import Perfil

class Usuario(models.Model):
    TIPO_USUARIO_CHOICES = [
        ('leitor', 'Leitor'),
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
    data_nascimento = models.CharField(max_length=45, blank=True, null=True)
    telefone = models.CharField(max_length=45, blank=True, null=True)
    foto = models.CharField(max_length=45, blank=True, null=True)
    descricao = models.CharField(max_length=45, blank=True, null=True)
    conquistas = models.CharField(max_length=45, blank=True, null=True)

    # NOVOS CAMPOS DE AUDITORIA (LGPD)
    termos_aceitos = models.BooleanField(default=False)
    data_aceite_termos = models.DateTimeField(null=True, blank=True)

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
    
class Notificacao(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificacoes_sistema')
    titulo = models.CharField(max_length=150)
    mensagem = models.TextField()
    lida = models.BooleanField(default=False)
    data_criacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificacoes'

    def __str__(self):
        return f"{self.titulo} - {self.usuario.username}"
    
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