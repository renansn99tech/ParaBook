"""Valida schema canônico e operações consumidas por web/Expo.

Usa apenas a biblioteca padrão para não acrescentar dependências ao runtime.
Chamadas com URL dinâmica precisam de um comentário imediatamente anterior:
``// openapi-contract: POST /biblioteca/recurso/{id}/``. Retries que reutilizam
uma requisição já validada podem usar ``openapi-contract-ignore`` com motivo.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLIENTS = {
    'web': ROOT / 'parabook-web' / 'src',
    'mobile': ROOT / 'parabook-mobile' / 'src',
}
SOURCE_SUFFIXES = {'.js', '.jsx', '.ts', '.tsx'}
CALL_RE = re.compile(r'\b(?:api|axios)\.(get|post|put|patch|delete)\s*\(', re.IGNORECASE)
ANNOTATION_RE = re.compile(r'openapi-contract:\s*(GET|POST|PUT|PATCH|DELETE)\s+(\S+)', re.IGNORECASE)
IGNORE_RE = re.compile(r'openapi-contract-ignore:\s*(\S.+)', re.IGNORECASE)
TEMPLATE_RE = re.compile(r'\$\{[^}]+\}')


def _normalizar_caminho(valor: str) -> str:
    valor = valor.strip()
    valor = re.sub(r'^https?://[^/]+', '', valor)
    valor = re.sub(r'^\$\{API_BASE_URL\}', '', valor)
    valor = valor.split('?', 1)[0]
    valor = TEMPLATE_RE.sub('{param}', valor)
    if not valor.startswith('/'):
        valor = f'/{valor}'
    if not valor.startswith('/api/v1/'):
        valor = f'/api/v1{valor}'
    return re.sub(r'/+', '/', valor)


def _ler_literal(texto: str, inicio: int) -> tuple[str | None, int]:
    pos = inicio
    while pos < len(texto) and texto[pos].isspace():
        pos += 1
    if pos >= len(texto) or texto[pos] not in "'\"`":
        return None, pos
    delimitador = texto[pos]
    fim = pos + 1
    while fim < len(texto):
        if texto[fim] == delimitador and texto[fim - 1] != '\\':
            return texto[pos + 1:fim], fim + 1
        fim += 1
    return None, pos


def _linhas_anteriores(texto: str, pos: int, quantidade: int = 3) -> str:
    linhas = texto[:pos].splitlines()
    return '\n'.join(linhas[-quantidade:])


def coletar_operacoes() -> tuple[dict[str, set[tuple[str, str]]], list[str]]:
    por_cliente = {cliente: set() for cliente in CLIENTS}
    erros: list[str] = []
    for cliente, diretorio in CLIENTS.items():
        for arquivo in sorted(diretorio.rglob('*')):
            if arquivo.suffix not in SOURCE_SUFFIXES or not arquivo.is_file():
                continue
            texto = arquivo.read_text(encoding='utf-8')
            relativo = arquivo.relative_to(ROOT).as_posix()

            for anotacao in ANNOTATION_RE.finditer(texto):
                por_cliente[cliente].add((anotacao.group(1).lower(), _normalizar_caminho(anotacao.group(2))))

            for chamada in CALL_RE.finditer(texto):
                metodo = chamada.group(1).lower()
                literal, _fim = _ler_literal(texto, chamada.end())
                if literal is not None:
                    contexto = _linhas_anteriores(texto, chamada.start())
                    if IGNORE_RE.search(contexto):
                        continue
                    por_cliente[cliente].add((metodo, _normalizar_caminho(literal)))
                    continue
                contexto = _linhas_anteriores(texto, chamada.start())
                if ANNOTATION_RE.search(contexto) or IGNORE_RE.search(contexto):
                    continue
                linha = texto.count('\n', 0, chamada.start()) + 1
                erros.append(
                    f'{relativo}:{linha}: URL dinâmica sem openapi-contract ou openapi-contract-ignore'
                )
    return por_cliente, erros


def _padrao_caminho(caminho: str) -> re.Pattern[str]:
    escapado = re.escape(caminho)
    escapado = re.sub(r'\\\{[^}]+\\\}', r'[^/]+', escapado)
    return re.compile(f'^{escapado}$')


def operacao_existe(schema: dict, metodo: str, caminho: str) -> bool:
    for caminho_schema, definicao in schema.get('paths', {}).items():
        if _padrao_caminho(caminho_schema).match(caminho) and metodo in definicao:
            return True
    return False


def manifesto(operacoes: dict[str, set[tuple[str, str]]]) -> dict:
    return {
        'version': 1,
        'clients': {
            cliente: [
                {'method': metodo.upper(), 'path': caminho}
                for metodo, caminho in sorted(itens, key=lambda item: (item[1], item[0]))
            ]
            for cliente, itens in operacoes.items()
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--schema', type=Path, required=True)
    parser.add_argument('--canonical', type=Path)
    parser.add_argument('--manifest', type=Path, default=ROOT / 'contracts' / 'api-consumers.json')
    parser.add_argument('--write-manifest', action='store_true')
    args = parser.parse_args()

    schema = json.loads(args.schema.read_text(encoding='utf-8'))
    erros: list[str] = []
    if args.canonical:
        canonical = json.loads(args.canonical.read_text(encoding='utf-8'))
        if canonical != schema:
            erros.append('O schema gerado diverge de contracts/openapi.json; regenere e revise o diff.')

    operacoes, erros_coleta = coletar_operacoes()
    erros.extend(erros_coleta)
    atual = manifesto(operacoes)

    if args.write_manifest:
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(atual, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    else:
        esperado = json.loads(args.manifest.read_text(encoding='utf-8'))
        if esperado != atual:
            erros.append('As chamadas dos clientes divergem de contracts/api-consumers.json; revise e regenere o manifesto.')

    for cliente, itens in operacoes.items():
        for metodo, caminho in sorted(itens):
            if not operacao_existe(schema, metodo, caminho):
                erros.append(f'{cliente}: operação ausente no OpenAPI: {metodo.upper()} {caminho}')

    if erros:
        print('\n'.join(f'ERRO: {erro}' for erro in erros), file=sys.stderr)
        return 1
    total = sum(len(itens) for itens in operacoes.values())
    print(f'Contrato OpenAPI válido: {total} operações consumidas por web/Expo.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
