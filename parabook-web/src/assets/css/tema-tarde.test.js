import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const baseCss = readFileSync(fileURLToPath(new URL('./base.css', import.meta.url)), 'utf8');
const indexHtml = readFileSync(
  fileURLToPath(new URL('../../../index.html', import.meta.url)),
  'utf8',
);

function blocoDoSeletor(css, seletor) {
  const inicio = css.indexOf(seletor);
  if (inicio === -1) return null;
  const abre = css.indexOf('{', inicio);
  const fecha = css.indexOf('}', abre);
  // Blocos de custom properties não aninham chaves, então o primeiro `}`
  // fecha o bloco.
  return css.slice(abre + 1, fecha);
}

test('base.css tem o bloco global do tema tarde', () => {
  assert.ok(
    baseCss.includes(':root[data-tema="tarde"]'),
    'o seletor de superfície :root[data-tema="tarde"] sumiu do base.css',
  );
});

test('o tema tarde redefine a superfície inteira, não só um acento', () => {
  // A "globalidade" do tema mora nestes canais: se o bloco parar de definir
  // fundo, texto e borda, o tarde deixa de repintar o app e vira só landing.
  const bloco = blocoDoSeletor(baseCss, ':root[data-tema="tarde"]');
  assert.ok(bloco, 'bloco do tema tarde não encontrado');
  for (const token of ['--bg-main', '--bg-card', '--bg-deep', '--text', '--border']) {
    assert.ok(
      bloco.includes(`${token}:`),
      `o tema tarde precisa redefinir ${token} para valer no app inteiro`,
    );
  }
});

test('os comentários do base.css estão balanceados (trava o build-breaker do */)', () => {
  // Escrever `*/` dentro de um comentário (ex.: `--x-*/`) fecha o comentário
  // cedo e deixa um `*/` órfão, quebrando o build. Isso desbalanceia a
  // contagem de aberturas e fechamentos — que é o que travamos aqui.
  const aberturas = (baseCss.match(/\/\*/g) || []).length;
  const fechamentos = (baseCss.match(/\*\//g) || []).length;
  assert.equal(
    aberturas,
    fechamentos,
    `comentários desbalanceados: ${aberturas} "/*" x ${fechamentos} "*/"`,
  );
});

test('o script de pré-pintura do index.html reconhece o tema tarde', () => {
  // Se o script bloqueante do <head> não conhecer 'tarde', o usuário que
  // escolheu tarde toma um flash de tema errado antes do React montar.
  assert.match(indexHtml, /parabookTema/);
  assert.match(indexHtml, /['"]tarde['"]/);
});
