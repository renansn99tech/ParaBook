import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (url) => readFileSync(fileURLToPath(url), 'utf8');
const navbar = ler(new URL('./Navbar.jsx', import.meta.url));
const css = ler(new URL('../assets/css/navbar.css', import.meta.url));
const app = ler(new URL('../App.jsx', import.meta.url));

test('drawer esconde no desktop apenas os grupos já presentes na navbar', () => {
  assert.match(navbar, /offcanvas-section-primary offcanvas-mobile-only/);
  assert.match(navbar, /offcanvas-section offcanvas-mobile-only/);
  assert.match(css, /@media \(min-width:1200px\)[\s\S]*?\.offcanvas-mobile-only\s*{\s*display:none/);
});

test('todos os destinos complementares do drawer possuem rota React', () => {
  const destinos = [
    '/recomendacao-ia',
    '/autores',
    '/minhas-comunidades',
    '/ranking',
    '/minhas-conquistas',
    '/dashboard',
    '/sobre',
    '/minha-assinatura',
    '/planos',
  ];

  for (const destino of destinos) {
    assert.ok(navbar.includes(`to="${destino}"`), `${destino} precisa estar no drawer`);
    assert.ok(app.includes(`path="${destino}"`), `${destino} precisa ter rota em App.jsx`);
  }

  assert.doesNotMatch(navbar, /<Link[^>]+data-bs-dismiss="offcanvas"/);
  assert.match(navbar, /<Link[^>]+onClick={fecharMenu}/);
});

test('atalhos âmbar têm contraste, hover e foco visível próprios', () => {
  assert.match(css, /\.offcanvas-section \.link-ia\s*{/);
  assert.match(css, /\.offcanvas-section \.link-ia:hover,[\s\S]*?\.offcanvas-section \.offcanvas-subscription:hover/);
  assert.match(css, /\.offcanvas-section a:focus-visible/);
});
