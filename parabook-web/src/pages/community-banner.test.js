import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../assets/css/conteudo-comunidade.css', import.meta.url), 'utf8');
const pagina = readFileSync(new URL('./ConteudoComunidade.jsx', import.meta.url), 'utf8');

test('banner da comunidade usa identidade, título principal e metadados reais', () => {
  assert.match(pagina, /<section className="cc-banner"/);
  assert.match(pagina, /<h1>\{comunidade\.nome\}<\/h1>/);
  assert.match(pagina, /comunidade\?\.total_membros/);
  assert.match(pagina, /comunidade\.data_criacao/);
  assert.match(css, /\.cc-banner\s*\{[\s\S]*?border-radius: var\(--radius-xl\)/);
});

test('contas administrativas usam identificador sem link para usuários comuns', () => {
  assert.match(pagina, /function IdentidadePerfil/);
  assert.match(pagina, /if \(!clicavel\)/);
  assert.match(pagina, /identidade-perfil--admin/);
  assert.match(pagina, /item\.perfil_clicavel/);
  assert.match(pagina, /post\.autor_perfil_clicavel/);
  assert.match(pagina, /resposta\.autor_perfil_clicavel/);
  assert.match(css, /\.identidade-perfil--admin\s*\{[\s\S]*?cursor: default/);
});
