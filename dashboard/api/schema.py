"""Contrato OpenAPI dos payloads administrativos montados manualmente."""

from rest_framework import serializers


class SuspensaoSerializer(serializers.Serializer):
    ativa = serializers.BooleanField()
    protocolo = serializers.UUIDField()
    termina_em = serializers.DateTimeField()
    segundos_restantes = serializers.IntegerField()
    duracao_dias = serializers.IntegerField()


class UsuarioAdminSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    nome = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    tipo = serializers.CharField()
    is_staff = serializers.BooleanField()
    is_superuser = serializers.BooleanField()
    is_active = serializers.BooleanField()
    last_login = serializers.DateTimeField(allow_null=True)
    date_joined = serializers.DateTimeField()
    suspensao = SuspensaoSerializer(allow_null=True)


class AuditoriaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    ator = serializers.CharField()
    acao = serializers.CharField()
    tipo = serializers.CharField()
    recurso = serializers.CharField()
    recurso_id = serializers.CharField(allow_null=True)
    sucesso = serializers.BooleanField()
    metadados = serializers.JSONField()
    criado_em = serializers.DateTimeField()


class EstatisticasSerializer(serializers.Serializer):
    total_usuarios = serializers.IntegerField()
    total_comunidades = serializers.IntegerField()
    total_livros = serializers.IntegerField()
    obras_publicadas = serializers.IntegerField()
    aprovacoes_pendentes = serializers.IntegerField()
    denuncias_abertas = serializers.IntegerField()
    novos_usuarios_hoje = serializers.IntegerField()
    comunidades_oficiais = serializers.IntegerField()


class PendenciasSerializer(serializers.Serializer):
    aprovacoes = serializers.IntegerField()
    denuncias = serializers.IntegerField()
    lixeira = serializers.IntegerField()


class ItemTurnoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    categoria = serializers.CharField()
    fila = serializers.CharField()
    titulo = serializers.CharField()
    detalhe = serializers.CharField()
    criado_em = serializers.DateTimeField()
    data_aproximada = serializers.BooleanField()
    acao = serializers.CharField()
    acao_label = serializers.CharField()


class TurnoSerializer(serializers.Serializer):
    itens = ItemTurnoSerializer(many=True)
    ultima_decisao = AuditoriaSerializer(allow_null=True)


class DashboardEstatisticasResponseSerializer(serializers.Serializer):
    estatisticas = EstatisticasSerializer()
    pendencias = PendenciasSerializer()
    turno = TurnoSerializer()
    atividade = AuditoriaSerializer(many=True)


class AplicarSuspensaoRequestSerializer(serializers.Serializer):
    duracao_dias = serializers.ChoiceField(choices=[3, 7, 15, 30])
    categoria = serializers.CharField()
    justificativa = serializers.CharField()
    senha_atual = serializers.CharField(write_only=True)


class AplicarSuspensaoResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    suspensao = SuspensaoSerializer()


class RevogarSuspensaoRequestSerializer(serializers.Serializer):
    justificativa = serializers.CharField()
    senha_atual = serializers.CharField(write_only=True)


class ProtocoloResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    protocolo = serializers.UUIDField()


class AlterarPapelRequestSerializer(serializers.Serializer):
    novo_papel = serializers.ChoiceField(choices=['leitor', 'autor'])
    justificativa = serializers.CharField()
    senha_atual = serializers.CharField(write_only=True)


class AlterarPapelResponseSerializer(ProtocoloResponseSerializer):
    tipo = serializers.CharField()


class SuporteAdminSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    protocolo = serializers.UUIDField()
    usuario_id = serializers.IntegerField()
    username = serializers.CharField()
    categoria = serializers.CharField()
    assunto = serializers.CharField()
    mensagem = serializers.CharField()
    status = serializers.CharField()
    resposta = serializers.CharField(allow_blank=True, allow_null=True)
    atendida_por = serializers.CharField(allow_null=True)
    criada_em = serializers.DateTimeField()
    atualizada_em = serializers.DateTimeField()


class ResponderSuporteRequestSerializer(serializers.Serializer):
    resposta = serializers.CharField(min_length=10, max_length=4000)
    status = serializers.CharField(required=False)


class PerfilPendenteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    nome = serializers.CharField()
    bio = serializers.CharField(allow_blank=True)
    data = serializers.DateTimeField()
    data_aproximada = serializers.BooleanField()
    livros_lidos = serializers.IntegerField()
    obras_enviadas = serializers.IntegerField()


class PublicacaoPendenteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    livro_id = serializers.IntegerField()
    tentativa_id = serializers.IntegerField(allow_null=True)
    titulo_livro = serializers.CharField()
    autor = serializers.CharField()
    data_envio = serializers.DateTimeField()
    categoria = serializers.CharField()
    isbn = serializers.CharField(allow_null=True)
    tem_capa = serializers.BooleanField()


class AprovacoesResponseSerializer(serializers.Serializer):
    perfis = PerfilPendenteSerializer(many=True)
    publicacoes = PublicacaoPendenteSerializer(many=True)


class DenunciaLivroSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    livro = serializers.CharField()
    denunciante = serializers.CharField()
    motivo = serializers.CharField()
    evidencias = serializers.CharField()
    protocolo = serializers.UUIDField()
    referencia_externa = serializers.CharField(allow_blank=True)
    suspensao_cautelar = serializers.BooleanField()
    status = serializers.CharField()
    data = serializers.DateTimeField()


class DenunciaComunidadeListaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    comunidade = serializers.CharField()
    denunciante = serializers.CharField()
    motivo = serializers.CharField()
    data = serializers.DateTimeField()


class DenunciasResponseSerializer(serializers.Serializer):
    livros = DenunciaLivroSerializer(many=True)
    comunidades = DenunciaComunidadeListaSerializer(many=True)


class ComunidadeDenunciasResponseSerializer(serializers.Serializer):
    comunidade = serializers.JSONField()
    resumo = serializers.DictField(child=serializers.IntegerField())
    denuncias = serializers.ListField(child=serializers.JSONField())
    historico = serializers.ListField(child=serializers.JSONField())


class ModeracaoRequestSerializer(serializers.Serializer):
    acao = serializers.CharField()
    observacao = serializers.CharField(required=False, allow_blank=True)
    motivo = serializers.CharField(required=False, allow_blank=True)
    tentativa_id = serializers.IntegerField(required=False)


class ModeracaoResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    status = serializers.CharField(required=False)
    categoria = serializers.CharField(required=False)
    acao = serializers.CharField(required=False)


class AuditoriaAvancadaSerializer(serializers.Serializer):
    resultados = AuditoriaSerializer(many=True)
    proximo_cursor = serializers.CharField(allow_null=True)
    contagens = serializers.DictField(child=serializers.IntegerField())
    eventos_hoje = serializers.IntegerField()
    filtro = serializers.CharField()


class ModeloAdminSerializer(serializers.Serializer):
    chave = serializers.CharField()
    nome = serializers.CharField()
    modelo = serializers.CharField()
    icone = serializers.CharField()
    contagem = serializers.IntegerField(allow_null=True)
    url = serializers.URLField()


class ModelosAdminResponseSerializer(serializers.Serializer):
    modelos = ModeloAdminSerializer(many=True)
    django_admin_url = serializers.URLField()
    ultimo_acesso = serializers.DateTimeField(allow_null=True)


class UrlResponseSerializer(serializers.Serializer):
    url = serializers.URLField()


class FeatureFlagSerializer(serializers.Serializer):
    chave = serializers.CharField()
    descricao = serializers.CharField()
    habilitada = serializers.BooleanField()
    disponivel = serializers.BooleanField()
    atualizada_em = serializers.DateTimeField()
    atualizada_por = serializers.CharField(allow_null=True)


class FeatureFlagRequestSerializer(serializers.Serializer):
    chave = serializers.CharField()
    habilitada = serializers.BooleanField()


class FeatureFlagEstadoSerializer(serializers.Serializer):
    chave = serializers.CharField()
    habilitada = serializers.BooleanField()


class FeatureFlagsPublicasSerializer(serializers.Serializer):
    banner_anuncios = serializers.BooleanField()
    acervo_avancado_beta = serializers.BooleanField()


class LixeiraItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    titulo = serializers.CharField(required=False)
    livro = serializers.CharField(required=False)
    motivo = serializers.CharField(required=False)
    data_remocao = serializers.DateTimeField(required=False, allow_null=True)
    data_arquivamento = serializers.DateTimeField(required=False, allow_null=True)
    dias_retencao = serializers.IntegerField(allow_null=True)


class LixeiraResponseSerializer(serializers.Serializer):
    obras = LixeiraItemSerializer(many=True)
    denuncias = LixeiraItemSerializer(many=True)


class LixeiraRequestSerializer(serializers.Serializer):
    acao = serializers.ChoiceField(choices=['restaurar_livro', 'reabrir_denuncia'])
    item_id = serializers.IntegerField(min_value=1)
    motivo = serializers.CharField()


class DetailSerializer(serializers.Serializer):
    detail = serializers.CharField()
