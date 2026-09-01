class Categorias:
    FILOSOFIA = "filosofia"
    LITERATURA = "literatura"
    RELIGIOSOS = "religiosos"
    EXATAS = "exatas"
    INFANTIS = "infantis"


CATEGORIAS_PADRAO = [
    Categorias.FILOSOFIA,
    Categorias.LITERATURA,
    Categorias.RELIGIOSOS,
    Categorias.EXATAS,
    Categorias.INFANTIS,
]


class StatusBiblioteca:
    LENDO = "lendo"
    LIDO = "lido"
    QUERO_LER = "quero_ler"


class StatusObra:
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    REJEITADO = "rejeitado"
