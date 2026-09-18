"""Detecta mudanças incompatíveis entre dois contratos OpenAPI locais."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


HTTP_METHODS = {'get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'}


def resolver(schema_raiz: dict, trecho: dict | None) -> dict:
    atual = trecho or {}
    visitados: set[str] = set()
    while isinstance(atual, dict) and '$ref' in atual:
        referencia = atual['$ref']
        if referencia in visitados or not referencia.startswith('#/'):
            break
        visitados.add(referencia)
        atual = schema_raiz
        for parte in referencia[2:].split('/'):
            atual = atual[parte.replace('~1', '/').replace('~0', '~')]
    return atual if isinstance(atual, dict) else {}


def esquema_json(operacao: dict, chave: str, status: str | None = None) -> dict:
    alvo = operacao.get(chave, {})
    if status is not None:
        alvo = alvo.get(status, {})
    conteudo = alvo.get('content', {}) if isinstance(alvo, dict) else {}
    for tipo in ('application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'):
        if tipo in conteudo:
            return conteudo[tipo].get('schema', {})
    return {}


def comparar_esquema(
    base_raiz: dict,
    candidato_raiz: dict,
    base: dict,
    candidato: dict,
    caminho: str,
    direcao: str,
    erros: list[str],
) -> None:
    base = resolver(base_raiz, base)
    candidato = resolver(candidato_raiz, candidato)
    tipo_base = base.get('type')
    tipo_candidato = candidato.get('type')
    if tipo_base and tipo_candidato and tipo_base != tipo_candidato:
        erros.append(f'{caminho}: tipo mudou de {tipo_base} para {tipo_candidato}')
        return

    enum_base = set(base.get('enum', []))
    enum_candidato = set(candidato.get('enum', []))
    if enum_base and enum_candidato:
        invalidos = enum_base - enum_candidato if direcao == 'request' else enum_candidato - enum_base
        if invalidos:
            sentido = 'valores antes aceitos removidos' if direcao == 'request' else 'novos valores retornados'
            erros.append(f'{caminho}: {sentido}: {sorted(invalidos, key=str)}')

    if tipo_base == 'array' or 'items' in base:
        comparar_esquema(
            base_raiz, candidato_raiz, base.get('items', {}), candidato.get('items', {}),
            f'{caminho}[]', direcao, erros,
        )

    props_base = base.get('properties', {})
    props_candidato = candidato.get('properties', {})
    for nome in sorted(set(props_base) - set(props_candidato)):
        erros.append(f'{caminho}.{nome}: propriedade removida')
    for nome in sorted(set(props_base) & set(props_candidato)):
        comparar_esquema(
            base_raiz, candidato_raiz, props_base[nome], props_candidato[nome],
            f'{caminho}.{nome}', direcao, erros,
        )

    obrigatorios_base = set(base.get('required', []))
    obrigatorios_candidato = set(candidato.get('required', []))
    alterados = (
        obrigatorios_candidato - obrigatorios_base
        if direcao == 'request'
        else obrigatorios_base - obrigatorios_candidato
    )
    for nome in sorted(alterados):
        descricao = 'passou a ser obrigatória' if direcao == 'request' else 'deixou de ser garantida na resposta'
        erros.append(f'{caminho}.{nome}: {descricao}')


def comparar(base: dict, candidato: dict) -> list[str]:
    erros: list[str] = []
    caminhos_base = base.get('paths', {})
    caminhos_candidato = candidato.get('paths', {})
    for caminho, item_base in caminhos_base.items():
        if caminho not in caminhos_candidato:
            erros.append(f'{caminho}: endpoint removido')
            continue
        item_candidato = caminhos_candidato[caminho]
        for metodo in sorted(HTTP_METHODS & set(item_base)):
            if metodo not in item_candidato:
                erros.append(f'{metodo.upper()} {caminho}: método removido')
                continue
            op_base = item_base[metodo]
            op_candidato = item_candidato[metodo]
            base_params = {(p.get('name'), p.get('in')): p for p in op_base.get('parameters', [])}
            candidato_params = {(p.get('name'), p.get('in')): p for p in op_candidato.get('parameters', [])}
            for chave, parametro in candidato_params.items():
                if parametro.get('required') and chave not in base_params:
                    erros.append(f'{metodo.upper()} {caminho}: novo parâmetro obrigatório {chave}')

            comparar_esquema(
                base, candidato,
                esquema_json(op_base, 'requestBody'),
                esquema_json(op_candidato, 'requestBody'),
                f'{metodo.upper()} {caminho} request', 'request', erros,
            )

            respostas_base = {str(s): r for s, r in op_base.get('responses', {}).items() if str(s).startswith('2')}
            respostas_candidato = {str(s): r for s, r in op_candidato.get('responses', {}).items() if str(s).startswith('2')}
            for status in sorted(set(respostas_base) - set(respostas_candidato)):
                erros.append(f'{metodo.upper()} {caminho}: resposta de sucesso {status} removida')
            for status in sorted(set(respostas_base) & set(respostas_candidato)):
                comparar_esquema(
                    base, candidato,
                    esquema_json(op_base, 'responses', status),
                    esquema_json(op_candidato, 'responses', status),
                    f'{metodo.upper()} {caminho} response {status}', 'response', erros,
                )
    return erros


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument(
        '--approved-breaking-changes',
        type=Path,
        help='JSON com exceções pontuais e aprovadas para uma quebra de contrato.',
    )
    args = parser.parse_args()
    base = json.loads(args.baseline.read_text(encoding='utf-8'))
    candidato = json.loads(args.candidate.read_text(encoding='utf-8'))
    erros = comparar(base, candidato)
    aprovados: set[str] = set()
    if args.approved_breaking_changes:
        documento = json.loads(args.approved_breaking_changes.read_text(encoding='utf-8'))
        for excecao in documento.get('approved_exceptions', []):
            aprovados.update(excecao.get('errors', []))

    erros_nao_aprovados = [erro for erro in erros if erro not in aprovados]
    excecoes_sem_uso = sorted(aprovados - set(erros))
    if excecoes_sem_uso:
        erros_nao_aprovados.extend(
            f'Exceção de quebra aprovada sem mudança correspondente: {erro}'
            for erro in excecoes_sem_uso
        )
    if erros_nao_aprovados:
        print('Mudanças incompatíveis no OpenAPI:', file=sys.stderr)
        print('\n'.join(f'- {erro}' for erro in erros_nao_aprovados), file=sys.stderr)
        return 1
    if erros:
        print(f'Compatibilidade OpenAPI preservada com {len(erros)} exceção(ões) aprovada(s).')
        return 0
    print('Compatibilidade OpenAPI preservada.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
