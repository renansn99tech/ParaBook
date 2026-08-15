import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const lerCss = (nome) => readFileSync(
  fileURLToPath(new URL(`./${nome}`, import.meta.url)),
  'utf8',
);

test('perfil móvel usa toda a largura útil sem padding duplo', () => {
  const css = lerCss('perfil.css');
  assert.match(css, /\.perfil-content-wrapper\s*\{[\s\S]*?padding-inline:0;/);
  assert.match(css, /\.perfil-page\s*\{[\s\S]*?margin:0;[\s\S]*?var\(--safe-left\)/);
});

test('leitor e filtros mantêm tipografia e alvos adequados ao toque', () => {
  const leitura = lerCss('leitura.css');
  const biblioteca = lerCss('minha-biblioteca.css');

  assert.match(leitura, /\.leitura-page \.btn-tool\s*\{[\s\S]*?min-height:var\(--touch-target\)/);
  assert.match(leitura, /\.input-pagina-moderno\s*\{[\s\S]*?font-size:\s*1rem/);
  assert.match(biblioteca, /\.filter-input,[\s\S]*?\.filter-select\s*\{[\s\S]*?font-size:\s*1rem/);
});

test('ranking troca a tabela panorâmica por linhas em grid no celular', () => {
  const css = lerCss('painel.css');
  assert.match(css, /\.painel-tabela thead\s*\{\s*display:none/);
  assert.match(css, /grid-template-areas:[\s\S]*?"posicao leitor nivel"[\s\S]*?"posicao sequencia xp"/);
});

test('dashboard móvel compacta navegação e preserva controles de 44px', () => {
  const css = lerCss('admin.css');
  assert.match(css, /\.admin-sidebar-rodape\s*\{[\s\S]*?grid-template-columns:repeat\(3/);
  assert.match(css, /\.admin-main \.admin-table-acao\s*\{[\s\S]*?width:var\(--touch-target\)/);
  assert.match(css, /\.admin-main \.admin-filtro\s*\{\s*min-height:var\(--touch-target\)/);
});
