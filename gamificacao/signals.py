from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import ProgressoLeitor


@receiver(post_save, sender=User)
def criar_progresso_leitor(sender, instance, created, **kwargs):
    """
    Garante que todo novo usuário criado ganhe automaticamente
    um perfil de gamificação associado.
    """
    if created:
        ProgressoLeitor.objects.get_or_create(user=instance)