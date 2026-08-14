import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ORDEM,
  TEMA_PADRAO,
  ehTemaValido,
  normalizarTema,
  proximoTema,
  iconePara,
  rotuloProximo,
} from './tema-core.js';

test('o rodízio tem os três temas de UI na ordem escuro → tarde → claro', () => {
  assert.deepEqual(ORDEM, ['escuro', 'tarde', 'claro']);
  assert.ok(ORDEM.includes('tarde'), 'tarde precisa estar no rodízio global');
});

test('proximoTema fecha o ciclo passando por tarde', () => {
  assert.equal(proximoTema('escuro'), 'tarde');
  assert.equal(proximoTema('tarde'), 'claro');
  assert.equal(proximoTema('claro'), 'escuro');
});

test('valor inválido ou ausente cai no tema padrão', () => {
  assert.equal(TEMA_PADRAO, 'escuro');
  assert.equal(normalizarTema(null), 'escuro');
  assert.equal(normalizarTema('roxo'), 'escuro');
  assert.equal(normalizarTema(undefined), 'escuro');
  // A partir do padrão, o próximo clique leva a tarde.
  assert.equal(proximoTema('lixo'), 'tarde');
});

test('ehTemaValido reconhece só os três temas', () => {
  assert.ok(ehTemaValido('escuro'));
  assert.ok(ehTemaValido('tarde'));
  assert.ok(ehTemaValido('claro'));
  assert.ok(!ehTemaValido('sépia'));
});

test('o ícone reflete o tema atual', () => {
  assert.equal(iconePara('escuro'), 'fa-moon');
  assert.equal(iconePara('tarde'), 'fa-cloud-sun');
  assert.equal(iconePara('claro'), 'fa-sun');
});

test('o rótulo acessível anuncia o PRÓXIMO tema, não o atual', () => {
  // Estando no escuro, o clique vai para tarde: o rótulo tem de dizer isso.
  assert.equal(rotuloProximo('escuro'), 'Mudar para o tema de fim de tarde');
  assert.equal(rotuloProximo('tarde'), 'Mudar para o tema claro');
  assert.equal(rotuloProximo('claro'), 'Mudar para o tema escuro');
});
