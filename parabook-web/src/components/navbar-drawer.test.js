import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (url) => readFileSync(fileURLToPath(url), 'utf8');
const navbar = ler(new URL('./Navbar.jsx', import.meta.url));
const css = ler(new URL('../assets/css/navbar.css', import.meta.url));
const app = ler(new URL('../App.jsx', import.meta.url));

test('navbar distribui marca, destinos e ações em três zonas', () => {
  assert.match(navbar, /className="navbar-container"/);
  assert.match(navbar, /className="menu navbar-menu-centro"/);
  assert.match(css, /\.navbar > \.navbar-container\s*{[\s\S]*?width:100%;[\s\S]*?max-width:var\(--layout-max\)/);
  assert.match(css, /grid-template-columns:minmax\(220px, 1fr\) auto minmax\(220px, 1fr\)/);
  assert.match(navbar, /<Link to="\/autores">Autores<\/Link>/);
  assert.doesNotMatch(navbar, /<li><Link to="\/publicar">/);
});

test('drawer evita repetir no desktop os destinos centrais', () => {
  assert.match(navbar, /offcanvas-section-primary offcanvas-mobile-only/);
  assert.match(navbar, /offcanvas-section offcanvas-section-publicar/);
  assert.match(navbar, /const ctaPublicacao = user/);
  assert.match(navbar, /to=\{ctaPublicacao\.to\}/);
  assert.match(css, /@media \(min-width:981px\)[\s\S]*?\.offcanvas-mobile-only\s*{\s*display:none/);
});

test('botão circular oferece drawer de conta e atalho de duplo clique', () => {
  assert.match(navbar, /className="nav-perfil-circular"/);
  assert.match(navbar, /onClick={abrirConta}/);
  assert.match(navbar, /onDoubleClick={abrirPerfilDireto}/);
  assert.match(navbar, /navigate\('\/perfil'\)/);
  assert.match(navbar, /role="dialog" aria-modal="true"/);
  for (const opcao of ['Perfil', 'Sair', 'Minha Assinatura', 'Ranking']) {
    assert.ok(navbar.includes(`<strong>${opcao}</strong>`), `${opcao} precisa estar no drawer da conta`);
  }
  assert.match(css, /\.nav-account-drawer\.is-open\s*{/);
});

test('menu completo surge pela borda e permanece acessível em telas de toque', () => {
  assert.match(navbar, /className="edge-menu-zone"/);
  assert.match(navbar, /className="edge-menu-trigger"/);
  assert.doesNotMatch(navbar, /navbar-mobile-trigger/);
  assert.match(css, /\.edge-menu-zone\s*{[\s\S]*?top:max\(6px, var\(--safe-top\)\);[\s\S]*?height:84px/);
  assert.match(css, /\.edge-menu-zone:hover \.edge-menu-trigger/);
  assert.match(css, /@media \(hover:none\), \(pointer:coarse\)/);
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
    '/backlog',
    '/minha-assinatura',
    '/planos',
  ];

  for (const destino of destinos) {
    assert.ok(navbar.includes(`to="${destino}"`), `${destino} precisa estar no drawer`);
    assert.ok(app.includes(`path="${destino}"`), `${destino} precisa ter rota em App.jsx`);
  }

  assert.match(app, /path="\/publicar"/);

  assert.doesNotMatch(navbar, /<Link[^>]+data-bs-dismiss="offcanvas"/);
  assert.match(navbar, /<Link[^>]+onClick={fecharMenu}/);
});

test('menu lateral separa informações institucionais na subseção Conhecer', () => {
  assert.match(navbar, /offcanvas-section offcanvas-section-conhecer/);
  assert.match(navbar, /<p className="offcanvas-kicker">Conhecer<\/p>/);
  assert.match(navbar, /to="\/sobre"[\s\S]*?<span>Sobre o ParaBook<\/span>/);
  assert.match(navbar, /to="\/backlog"[\s\S]*?<span>Backlog\/Changelog<\/span>/);
  assert.match(app, /path="\/backlog"/);
});

test('ranking e assinatura ficam apenas no menu da conta, sem duplicar no lateral', () => {
  assert.equal(navbar.match(/to="\/ranking"/g)?.length, 1);
  assert.equal(navbar.match(/to="\/minha-assinatura"/g)?.length, 1);
  assert.doesNotMatch(navbar, /Ranking de leitores/);
  assert.doesNotMatch(navbar, /<span>Minha assinatura<\/span>/);
});

test('atalhos âmbar têm contraste, hover e foco visível próprios', () => {
  assert.match(css, /\.offcanvas-section \.link-ia\s*{/);
  assert.match(css, /\.offcanvas-section \.link-ia:hover,[\s\S]*?\.offcanvas-section \.offcanvas-subscription:hover/);
  assert.match(css, /\.offcanvas-section a:focus-visible/);
  assert.match(css, /:root\[data-tema="claro"\] \.offcanvas\s*{[\s\S]*?background-color:#cbd3e0;[\s\S]*?rgba\(88,70,130,\.28\)/);
  assert.match(css, /:root\[data-tema="claro"\] \.offcanvas-section \.link-ia\s*{[\s\S]*?\.096/);
  assert.match(css, /:root\[data-tema="claro"\] \.offcanvas-section \.offcanvas-subscription\s*{[\s\S]*?\.216[\s\S]*?\.096/);
});
