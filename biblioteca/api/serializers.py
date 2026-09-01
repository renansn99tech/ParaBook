# api/serializers.py
from django.conf import settings
from rest_framework import serializers
from biblioteca.models import Livro, Categoria, Biblioteca, SolicitacaoPublicacao
from django.contrib.auth.models import User
from biblioteca.validators import validar_pdf_livro
from biblioteca.services import verificar_acesso_obra
from usuarios.identidade_publica import identidade_publica

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

class LivroSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    capa_url = serializers.SerializerMethodField()
    pdf_disponivel = serializers.SerializerMethodField()
    capa = serializers.ImageField(write_only=True, required=False, allow_null=True)
    pdf = serializers.FileField(write_only=True, required=False, allow_null=True)
    pdf_amostra = serializers.FileField(write_only=True, required=False, allow_null=True)
    origem_label = serializers.CharField(source='get_origem_display', read_only=True)
    modelo_acesso_label = serializers.CharField(source='get_modelo_acesso_display', read_only=True)
    selo_independente = serializers.SerializerMethodField()
    acesso = serializers.SerializerMethodField()

    class Meta:
        model = Livro
        fields = [
            'id', 'titulo', 'autor', 'categoria', 'categoria_nome',
            'origem', 'origem_label', 'selo_independente', 'status',
            'modelo_acesso', 'modelo_acesso_label', 'acesso',
            'disponivel_de', 'disponivel_ate', 'territorio_cultural',
            'ano_publicacao', 'paginas', 'edicao', 'avaliacao', 'isbn',
            'capa', 'capa_url', 'pdf', 'pdf_amostra', 'pdf_disponivel',
        ]
        read_only_fields = ['avaliacao']

    def get_capa_url(self, obj):
        if obj.capa:
            return obj.capa.url
        return None

    def get_pdf_disponivel(self, obj):
        return bool(obj.pdf)

    def get_selo_independente(self, obj):
        return obj.origem == 'autor_independente'

    def get_acesso(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        return verificar_acesso_obra(user, obj).para_api()

    def validate_pdf(self, value):
        return validar_pdf_livro(value) if value else value

    def validate_pdf_amostra(self, value):
        return validar_pdf_livro(value) if value else value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        inicio = attrs.get('disponivel_de', getattr(self.instance, 'disponivel_de', None))
        fim = attrs.get('disponivel_ate', getattr(self.instance, 'disponivel_ate', None))
        modelo = attrs.get('modelo_acesso', getattr(self.instance, 'modelo_acesso', 'gratuito'))
        amostra = attrs.get('pdf_amostra', getattr(self.instance, 'pdf_amostra', None))
        if inicio and fim and inicio >= fim:
            raise serializers.ValidationError({
                'disponivel_ate': 'A data final deve ser posterior à data inicial.'
            })
        if modelo == 'amostra' and not amostra:
            raise serializers.ValidationError({
                'pdf_amostra': 'Envie um PDF de amostra para este modelo de acesso.'
            })
        return attrs

class EstanteSerializer(serializers.ModelSerializer):
    livro_titulo = serializers.CharField(source='livro.titulo', read_only=True)
    livro_autor = serializers.CharField(source='livro.autor', read_only=True)
    livro_capa = serializers.SerializerMethodField()
    livro_paginas = serializers.IntegerField(source='livro.paginas', read_only=True)

    class Meta:
        model = Biblioteca
        fields = ['id', 'livro', 'livro_titulo', 'livro_autor', 'livro_capa', 'livro_paginas', 'status', 'favorito', 'nota', 'resenha', 'pagina_atual', 'ultima_leitura_em', 'data_conclusao', 'avaliada_em', 'data_adicao']
        read_only_fields = ['user', 'avaliada_em']

    def get_livro_capa(self, obj):
        if obj.livro and obj.livro.capa:
            return obj.livro.capa.url
        return None

    def validate(self, attrs):
        attrs = super().validate(attrs)
        livro = attrs.get('livro') or getattr(self.instance, 'livro', None)
        if self.instance is None and livro:
            request = self.context.get('request')
            if request and Biblioteca.objects.filter(user=request.user, livro=livro).exists():
                raise serializers.ValidationError({'livro': 'Este livro já está presente na sua estante.'})
        pagina = attrs.get('pagina_atual')
        if pagina is not None and livro and livro.paginas and pagina > livro.paginas:
            raise serializers.ValidationError({'pagina_atual': 'A página excede o total do livro.'})
        return attrs

class ResenhaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField()
    usuario_perfil_clicavel = serializers.SerializerMethodField()
    usuario_foto = serializers.SerializerMethodField()

    class Meta:
        model = Biblioteca
        fields = ['id', 'usuario_nome', 'usuario_perfil_clicavel', 'usuario_foto', 'nota', 'resenha', 'data_adicao']

    def get_usuario_nome(self, obj):
        request = self.context.get('request')
        viewer = request.user if request else None
        return identidade_publica(obj.user, viewer)['username']

    def get_usuario_perfil_clicavel(self, obj):
        request = self.context.get('request')
        viewer = request.user if request else None
        return identidade_publica(obj.user, viewer)['perfil_clicavel']
    
    def get_usuario_foto(self, obj):
        # Mapeia dinamicamente os relacionamentos de Perfil existentes no Parabook
        user = obj.user
        request = self.context.get('request')
        viewer = request.user if request else None
        if not identidade_publica(user, viewer)['perfil_clicavel']:
            return None
        if hasattr(user, 'perfil_da_biblioteca') and user.perfil_da_biblioteca.foto:
            return user.perfil_da_biblioteca.foto.url
        elif hasattr(user, 'perfil') and user.perfil.foto:
            return user.perfil.foto.url
        return None


class SolicitacaoPublicacaoSerializer(serializers.ModelSerializer):
    """Recebe o formulário de PublicarLivro.jsx e cria o Livro (status=pendente) + a solicitação de moderação."""
    pdf = serializers.FileField(required=True, error_messages={'required': 'O arquivo PDF do livro é obrigatório.'})

    # Campos de identificação/compliance do autor: validados aqui, mas ainda não persistidos
    # em nenhum model (mesmo comportamento da ObraAutorForm legada - ver biblioteca/forms.py).
    cpf_autor = serializers.CharField(write_only=True, max_length=14)
    registro_autoral = serializers.CharField(write_only=True, max_length=100, required=False, allow_blank=True)
    numero_registro = serializers.CharField(write_only=True, max_length=20, required=False, allow_blank=True)
    declaracao_autoria = serializers.BooleanField(write_only=True)
    aceitou_termos = serializers.BooleanField(write_only=True)

    class Meta:
        model = Livro
        fields = [
            'id', 'titulo', 'categoria', 'paginas', 'ano_publicacao', 'isbn', 'edicao', 'capa', 'pdf',
            'cpf_autor', 'registro_autoral', 'numero_registro', 'declaracao_autoria', 'aceitou_termos',
        ]

    def validate_declaracao_autoria(self, value):
        if not value:
            raise serializers.ValidationError("É necessário declarar que você é o autor da obra.")
        return value

    def validate_aceitou_termos(self, value):
        if not value:
            raise serializers.ValidationError("É necessário aceitar os termos de uso.")
        return value

    def validate_pdf(self, value):
        return validar_pdf_livro(value)

    def validate_cpf_autor(self, value):
        digitos = ''.join(filter(str.isdigit, value))
        if len(digitos) != 11 or len(set(digitos)) == 1:
            raise serializers.ValidationError('Informe um CPF válido.')
        return digitos
