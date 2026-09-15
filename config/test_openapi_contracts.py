import json
from pathlib import Path

from django.test import SimpleTestCase

from scripts.check_openapi_compatibility import comparar
from scripts.check_openapi_contracts import coletar_operacoes, operacao_existe


ROOT = Path(__file__).resolve().parents[1]


class ContratoConsumidoresTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.schema = json.loads((ROOT / 'contracts' / 'openapi.json').read_text(encoding='utf-8'))

    def test_todas_as_operacoes_dos_clientes_existem(self):
        operacoes, erros = coletar_operacoes()
        self.assertEqual(erros, [])
        ausentes = [
            (cliente, metodo, caminho)
            for cliente, itens in operacoes.items()
            for metodo, caminho in itens
            if not operacao_existe(self.schema, metodo, caminho)
        ]
        self.assertEqual(ausentes, [])

    def test_rotas_de_suporte_expoem_apenas_os_metodos_reais(self):
        colecao = self.schema['paths']['/api/v1/dashboard/suporte/']
        detalhe = self.schema['paths']['/api/v1/dashboard/suporte/{item_id}/']

        self.assertIn('get', colecao)
        self.assertNotIn('patch', colecao)
        self.assertIn('patch', detalhe)
        self.assertNotIn('get', detalhe)


class CompatibilidadeOpenApiTests(SimpleTestCase):
    def test_detecta_endpoint_removido(self):
        base = {'paths': {'/api/v1/recurso/': {'get': {'responses': {'200': {}}}}}}
        self.assertIn('/api/v1/recurso/: endpoint removido', comparar(base, {'paths': {}}))

    def test_detecta_novo_campo_obrigatorio_na_requisicao(self):
        operacao_base = {
            'requestBody': {'content': {'application/json': {'schema': {
                'type': 'object', 'properties': {'nome': {'type': 'string'}}, 'required': ['nome'],
            }}}},
            'responses': {'200': {}},
        }
        operacao_nova = json.loads(json.dumps(operacao_base))
        esquema = operacao_nova['requestBody']['content']['application/json']['schema']
        esquema['properties']['documento'] = {'type': 'string'}
        esquema['required'].append('documento')
        base = {'paths': {'/api/v1/recurso/': {'post': operacao_base}}}
        nova = {'paths': {'/api/v1/recurso/': {'post': operacao_nova}}}
        self.assertTrue(any('documento: passou a ser obrigatória' in erro for erro in comparar(base, nova)))
