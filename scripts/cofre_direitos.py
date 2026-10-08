"""CLI offline do custodiante. Use identidade/credenciais separadas do backend."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from biblioteca.cofre_direitos import CofreDireitos  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--raiz', required=True)
    comandos = parser.add_subparsers(dest='acao', required=True)
    init = comandos.add_parser('inicializar')
    init.add_argument('--chave-id', required=True)
    guardar = comandos.add_parser('custodiar')
    guardar.add_argument('--documento', required=True)
    guardar.add_argument('--conferencia', required=True, help='JSON: dados do recibo e condições jurídicas conferidas')
    guardar.add_argument('--recibo-saida', required=True)
    args = parser.parse_args()
    try:
        cofre = CofreDireitos(args.raiz)
        if args.acao == 'inicializar':
            print(json.dumps(cofre.inicializar(args.chave_id)))
        else:
            entrada = json.loads(Path(args.conferencia).read_text('utf-8'))
            with Path(args.documento).open('rb') as arquivo:
                documento = arquivo.read(5 * 1024 * 1024 + 1)
            recibo = cofre.custodiar(documento, entrada['dados'], entrada['condicoes'])
            with Path(args.recibo_saida).open('x', encoding='utf-8') as arquivo:
                json.dump(recibo, arquivo, ensure_ascii=False)
            print('Custódia registrada; somente recibo mínimo exportado.')
    except (OSError, ValueError, KeyError):
        parser.exit(1, 'Custódia não concluída; confira entradas e acesso ao cofre.\n')


if __name__ == '__main__':
    main()
