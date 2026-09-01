import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const cssFiles = [
  'base.css',
  'autores.css',
  'biblioteca.css',
  'comunidade.css',
  'home.css',
  'novidade.css',
  'perfil.css',
  'sobre.css',
];

const estilos = cssFiles.map((arquivo) => ({
  arquivo,
  conteudo: readFileSync(new URL(arquivo, import.meta.url), 'utf8'),
}));

test('largura máxima da plataforma usa o token global de 1600px', () => {
  const base = estilos.find(({ arquivo }) => arquivo === 'base.css').conteudo;

  assert.match(base, /--layout-max:1600px/);

  for (const { arquivo, conteudo } of estilos) {
    assert.doesNotMatch(
      conteudo,
      /max-width:\s*1500px/,
      `${arquivo} não deve restabelecer o limite antigo de 1500px`,
    );
  }
});
