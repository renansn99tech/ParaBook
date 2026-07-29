from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class ProgressoLeitor(models.Model):
    """
    Mantém o estado atual do usuário no sistema de gamificação (XP, Nível, Streaks).
    Relacionamento 1:1 com o User do Django.
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='progresso_gamificacao'
    )
    pontos_xp = models.PositiveIntegerField(
        default=0, 
        db_index=True, 
        verbose_name="Pontos de Experiência (XP)"
    )
    nivel = models.PositiveIntegerField(
        default=1, 
        db_index=True, 
        verbose_name="Nível"
    )
    
    # Controle de Sequência (Streak)
    dias_seguidos = models.PositiveIntegerField(
        default=0, 
        verbose_name="Dias Seguidos de Leitura"
    )
    ultima_atividade = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Data da Última Atividade"
    )

    class Meta:
        verbose_name = "Progresso do Leitor"
        verbose_name_plural = "Progressos dos Leitores"

    def __str__(self):
        return f"{self.user.username} - Nível {self.nivel} ({self.pontos_xp} XP)"


class Conquista(models.Model):
    """
    Catálogo de badges/conquistas disponíveis no sistema.
    """
    CATEGORIA_CHOICES = [
        ('leitura', 'Leitura'),
        ('comunidade', 'Comunidade/Críticas'),
        ('assinatura', 'Assinatura'),
        ('especial', 'Especial'),
    ]

    slug = models.SlugField(
        unique=True, 
        max_length=50, 
        help_text="Identificador único para checagem via código (ex: primeira_leitura_concluida)"
    )
    nome = models.CharField(max_length=100)
    descricao = models.TextField(verbose_name="Descrição")
    icone = models.CharField(
        max_length=100, 
        default="bi-award", 
        help_text="Classe do ícone Bootstrap Icons (ex: bi-trophy, bi-star)"
    )
    categoria = models.CharField(
        max_length=20, 
        choices=CATEGORIA_CHOICES, 
        default='leitura'
    )
    pontos_recompensa = models.PositiveIntegerField(
        default=50, 
        help_text="XP concedido ao desbloquear"
    )

    class Meta:
        verbose_name = "Conquista"
        verbose_name_plural = "Conquistas"

    def __str__(self):
        return f"{self.nome} ({self.get_categoria_display()})"


class ConquistaUsuario(models.Model):
    """
    Tabela intermediária que registra quais conquistas o usuário já obteve.
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='conquistas'
    )
    conquista = models.ForeignKey(
        Conquista, 
        on_delete=models.CASCADE, 
        related_name='usuarios_conquistaram'
    )
    data_desbloqueio = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Conquista do Usuário"
        verbose_name_plural = "Conquistas dos Usuários"
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'conquista'], 
                name='unique_conquista_usuario'
            )
        ]

    def __str__(self):
        return f"{self.user.username} desbloqueou '{self.conquista.nome}'"