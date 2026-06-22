class Categorias:
    FILOSOFIA = "filosofia"
    LITERATURA = "literatura"
    RELIGIOSOS = "religiosos"
    EXATAS = "exatas"
    INFANTIS = "infantis"
    INDEPENDENTE = "independente"


CATEGORIAS_PADRAO = [
    Categorias.FILOSOFIA,
    Categorias.LITERATURA,
    Categorias.RELIGIOSOS,
    Categorias.EXATAS,
    Categorias.INFANTIS,
    Categorias.INDEPENDENTE,
]


class StatusBiblioteca:
    LENDO = "lendo"
    LIDO = "lido"
    QUERO_LER = "quero_ler"


class StatusObra:
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    REJEITADO = "rejeitado"