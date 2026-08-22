import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../assets/css/conteudo-comunidade.css', import.meta.url), 'utf8');
const pagina = readFileSync(new URL('./ConteudoComunidade.jsx', import.meta.url), 'utf8');

test('banner compartilhado alinha títulos e descrições de todas as comunidades', () => {
  assert.match(pagina, /<section className="banner-comunidade"/);
  assert.match(css, /\.banner-comunidade\s*{[\s\S]*?border: 0;[\s\S]*?text-align: center/);
  assert.match(css, /\.banner-comunidade p\s*{[\s\S]*?margin: 0 auto;[\s\S]*?text-align: center/);
  assert.doesNotMatch(css, /\.banner-comunidade\s*{[\s\S]*?border-right:/);
});
