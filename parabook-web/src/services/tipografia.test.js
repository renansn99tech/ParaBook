import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  normalizarTipografia,
  PRESETS_TIPOGRAFICOS,
  TIPOGRAFIA_PADRAO,
} from './tipografia.js';

const baseCss = readFileSync(new URL('../assets/css/base.css', import.meta.url), 'utf8');
const centralConta = readFileSync(new URL('../pages/CentralConta.jsx', import.meta.url), 'utf8');
const authContext = readFileSync(new URL('../context/AuthContext.jsx', import.meta.url), 'utf8');

test('catálogo tipográfico contém os quatro níveis do produto', () => {
  assert.deepEqual(Object.keys(PRESETS_TIPOGRAFICOS), [
    'padrao',
    'leitura_clara',
    'oficina_autor',
    'edicao_premium',
  ]);
});

test('chaves desconhecidas sempre voltam ao padrão público', () => {
  assert.equal(normalizarTipografia('leitura_clara'), 'leitura_clara');
  assert.equal(normalizarTipografia('inventada'), TIPOGRAFIA_PADRAO);
});

test('design system usa tokens e presets em vez de fontes soltas', () => {
  assert.match(baseCss, /font-family:var\(--fonte-interface\)/);
  assert.match(baseCss, /data-tipografia="leitura_clara"/);
  assert.match(baseCss, /data-tipografia="oficina_autor"/);
  assert.match(baseCss, /data-tipografia="edicao_premium"/);
});

test('preferência autenticada é aplicada globalmente e possui tela de escolha', () => {
  assert.match(authContext, /aplicarTipografia\(user\?\.tipografia_efetiva/);
  assert.match(centralConta, /aparencia: \['Tipografia e aparência', Aparencia, false\]/);
  assert.match(centralConta, /api\.patch\('\/perfis\/meu-perfil\/', \{ tipografia: chave \}\)/);
});
