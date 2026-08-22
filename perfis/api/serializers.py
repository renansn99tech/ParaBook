# pyrefly: ignore [missing-import]
from rest_framework import serializers
from django.conf import settings
from django.utils import timezone
from perfis.models import Perfil


def _interpretar_data_nascimento(valor):
    """Aceita os formatos legados sem alterar os dados armazenados."""
    from datetime import datetime

    valor = (valor or '').strip()
    for formato in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            return datetime.strptime(valor, formato).date()
        except ValueError:
            continue
    return None

class PerfilSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='usuario.username', required=False)
    email = serializers.CharField(source='usuario.email', read_only=True)
    tipo = serializers.CharField(source='usuario.perfil_customizado.tipo', read_only=True)
    nome = serializers.CharField(source='usuario.perfil_customizado.nome', required=False)
    date_joined = serializers.DateTimeField(source='usuario.date_joined', read_only=True)
    is_staff = serializers.BooleanField(source='usuario.is_staff', read_only=True)
    is_superuser = serializers.BooleanField(source='usuario.is_superuser', read_only=True)
    data_nascimento = serializers.DateField(write_only=True, required=False, allow_null=True)
    idade = serializers.SerializerMethodField()
    # Necessario para o React barrar a navegacao de quem ainda nao aceitou os termos,
    # equivalente ao ForcarAceiteTermosMiddleware do lado dos templates legados.
    termos_aceitos = serializers.SerializerMethodField()
    versao_termos_aceita = serializers.CharField(
        source='usuario.perfil_customizado.versao_termos_aceita', read_only=True
    )
    # Sinaliza ao front se o modal "Termine seu cadastro" deve ser exibido.
    onboarding_pendente = serializers.SerializerMethodField()
    is_premium = serializers.SerializerMethodField()
    tipografia_efetiva = serializers.SerializerMethodField()
    tipografia_nome = serializers.SerializerMethodField()
    tipografias_disponiveis = serializers.SerializerMethodField()

    @staticmethod
    def _usuario_customizado(obj):
        return getattr(obj.usuario, 'perfil_customizado', None)

    def _chaves_tipograficas_disponiveis(self, obj):
        usuario = self._usuario_customizado(obj)
        if obj.usuario.is_superuser:
            return {chave for chave, _nome in Perfil.Tipografia.choices}
        chaves = {
            Perfil.Tipografia.PADRAO,
            Perfil.Tipografia.LEITURA_CLARA,
        }
        if usuario and usuario.tipo == 'autor':
            chaves.add(Perfil.Tipografia.OFICINA_AUTOR)
        if usuario and usuario.is_premium:
            chaves.add(Perfil.Tipografia.EDICAO_PREMIUM)
        return chaves

    def get_termos_aceitos(self, obj):
        usuario = getattr(obj.usuario, 'perfil_customizado', None)
        return bool(
            usuario
            and usuario.termos_aceitos
            and usuario.versao_termos_aceita == settings.TERMS_VERSION
        )

    def get_onboarding_pendente(self, obj):
        usuario = getattr(obj.usuario, 'perfil_customizado', None)
        return bool(usuario and usuario.onboarding_perfil_pendente())

    def get_is_premium(self, obj):
        usuario = self._usuario_customizado(obj)
        return bool(usuario and usuario.is_premium)

    def get_data_nascimento(self, obj):
        usuario = self._usuario_customizado(obj)
        if usuario is None:
            return None
        nascimento = _interpretar_data_nascimento(usuario.data_nascimento)
        return nascimento.isoformat() if nascimento else None

    def get_idade(self, obj):
        usuario = self._usuario_customizado(obj)
        nascimento = _interpretar_data_nascimento(
            usuario.data_nascimento if usuario else None
        )
        hoje = timezone.localdate()
        if nascimento is None or nascimento > hoje:
            return None
        idade = hoje.year - nascimento.year - (
            (hoje.month, hoje.day) < (nascimento.month, nascimento.day)
        )
        return idade if idade <= 130 else None

    def validate_data_nascimento(self, value):
        if value is None:
            return None
        hoje = timezone.localdate()
        if value > hoje:
            raise serializers.ValidationError('A data de nascimento não pode estar no futuro.')
        if hoje.year - value.year > 130:
            raise serializers.ValidationError('Confira o ano informado.')
        return value

    def to_representation(self, instance):
        dados = super().to_representation(instance)
        dados['data_nascimento'] = self.get_data_nascimento(instance)
        return dados

    def get_tipografia_efetiva(self, obj):
        disponiveis = self._chaves_tipograficas_disponiveis(obj)
        return obj.tipografia if obj.tipografia in disponiveis else Perfil.Tipografia.PADRAO

    def get_tipografia_nome(self, obj):
        chave = self.get_tipografia_efetiva(obj)
        return Perfil.Tipografia(chave).label

    def get_tipografias_disponiveis(self, obj):
        disponiveis = self._chaves_tipograficas_disponiveis(obj)
        requisitos = {
            Perfil.Tipografia.PADRAO: 'Padrão público',
            Perfil.Tipografia.LEITURA_CLARA: 'Qualquer conta ParaBook',
            Perfil.Tipografia.OFICINA_AUTOR: 'Autor aprovado',
            Perfil.Tipografia.EDICAO_PREMIUM: 'Plano pago ativo',
        }
        return [
            {
                'chave': chave,
                'nome': nome,
                'disponivel': chave in disponiveis,
                'requisito': requisitos[chave],
            }
            for chave, nome in Perfil.Tipografia.choices
        ]

    def validate_tipografia(self, value):
        perfil = self.instance
        if perfil is None:
            request = self.context.get('request')
            perfil = getattr(getattr(request, 'user', None), 'perfil', None)
        if perfil is None or value not in self._chaves_tipograficas_disponiveis(perfil):
            raise serializers.ValidationError(
                'Esta opção tipográfica não está disponível para a sua conta.'
            )
        return value

    class Meta:
        model = Perfil
        fields = ['id', 'usuario', 'username', 'email', 'nome', 'tipo', 'date_joined', 'is_staff', 'is_superuser', 'data_nascimento', 'idade', 'exibir_idade', 'exibir_data_nascimento', 'exibir_email', 'termos_aceitos', 'versao_termos_aceita', 'onboarding_pendente', 'is_premium', 'historico', 'descricao_perfil', 'foto', 'capa', 'bio', 'localizacao', 'perfil_privado', 'meta_leitura_anual', 'tipografia', 'tipografia_efetiva', 'tipografia_nome', 'tipografias_disponiveis']
        read_only_fields = ['id', 'usuario', 'tipo', 'email', 'date_joined', 'is_staff', 'is_superuser', 'idade', 'termos_aceitos', 'versao_termos_aceita', 'onboarding_pendente', 'is_premium', 'tipografia_efetiva', 'tipografia_nome', 'tipografias_disponiveis']

    @staticmethod
    def _validar_imagem(arquivo):
        if arquivo is None:
            return None
        limite = 5 * 1024 * 1024
        if arquivo.size > limite:
            raise serializers.ValidationError('A imagem deve ter no máximo 5 MiB.')
        tipo = getattr(arquivo, 'content_type', '')
        if tipo and tipo not in {'image/jpeg', 'image/png', 'image/webp'}:
            raise serializers.ValidationError('Use uma imagem JPG, PNG ou WebP.')
        return arquivo

    def validate_foto(self, arquivo):
        return self._validar_imagem(arquivo)

    def validate_capa(self, arquivo):
        return self._validar_imagem(arquivo)

    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', {})
        data_nascimento = validated_data.pop('data_nascimento', serializers.empty)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if usuario_data:
            user = instance.usuario
            if 'username' in usuario_data:
                user.username = usuario_data['username']
                user.save()
                
            perfil_customizado = getattr(user, 'perfil_customizado', None)
            if perfil_customizado and 'perfil_customizado' in usuario_data:
                if 'nome' in usuario_data['perfil_customizado']:
                    perfil_customizado.nome = usuario_data['perfil_customizado']['nome']
                    perfil_customizado.save()

        if data_nascimento is not serializers.empty:
            perfil_customizado = self._usuario_customizado(instance)
            if perfil_customizado:
                perfil_customizado.data_nascimento = (
                    data_nascimento.isoformat() if data_nascimento else None
                )
                perfil_customizado.save(update_fields=['data_nascimento'])
                    
        return instance
