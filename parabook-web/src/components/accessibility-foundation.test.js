import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
const navbar = readFileSync(new URL('./Navbar.jsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('./Footer.jsx', import.meta.url), 'utf8');
const rotas = readFileSync(new URL('./RouteAccessibility.jsx', import.meta.url), 'utf8');
const login = readFileSync(new URL('../pages/Login.jsx', import.meta.url), 'utf8');
const cadastro = readFileSync(new URL('../pages/Register.jsx', import.meta.url), 'utf8');
const base = readFileSync(new URL('../assets/css/base.css', import.meta.url), 'utf8');
const estilosAuth = readFileSync(new URL('../assets/css/tela-login.css', import.meta.url), 'utf8');

test('shell oferece salto de navegação e região de conteúdo focalizável', () => {
  assert.match(app, /href="#conteudo-principal"/);
  assert.match(app, /id="conteudo-principal"[^>]+tabIndex="-1"/);
  assert.match(base, /\.skip-link:focus\s*\{/);
});

test('troca de rota atualiza título, anuncia a página e devolve o foco', () => {
  assert.match(rotas, /document\.title = `\$\{titulo\} \| ParaBook`/);
  assert.match(rotas, /role="status"[^>]+aria-live="polite"/);
  assert.match(rotas, /getElementById\('conteudo-principal'\)[\s\S]*focus/);
});

test('marca da navbar não cria um segundo título principal', () => {
  assert.doesNotMatch(navbar, /<h1[^>]+className="logo"/);
  assert.match(navbar, /aria-label="ParaBook — página inicial"/);
});

test('foco visível cobre controles nativos e links', () => {
  assert.match(base, /:where\(a, button, input, select, textarea/);
  assert.match(base, /outline:3px solid var\(--purple-light\)/);
});

test('autenticação associa falhas aos campos e usa alerta ao vivo', () => {
  for (const pagina of [login, cadastro]) {
    assert.match(pagina, /role="alert"/);
    assert.match(pagina, /aria-invalid=\{Boolean\(error\)\}/);
    assert.match(pagina, /aria-describedby=\{error \?/);
    assert.match(pagina, /<h1 className="auth-title">/);
  }
});

test('marca do login mantém escala visual sem virar título da página', () => {
  assert.match(login, /<div className="auth-wordmark">/);
  assert.match(estilosAuth, /\.auth-wordmark\s*\{[\s\S]*font-size:3rem/);
  assert.match(estilosAuth, /\.auth-image-side\s*\{[\s\S]*padding:66px 66px 75px;/);
});

test('livro do cadastro ignora o limite fluido do wrapper de ancoragem', () => {
  assert.match(estilosAuth, /\.auth-book\s*\{[\s\S]*width:330px;[\s\S]*max-width:none;/);
});

test('rolagem ao topo respeita preferência por movimento reduzido', () => {
  assert.match(footer, /prefers-reduced-motion: reduce/);
  assert.match(footer, /reduzirMovimento \? 'auto' : 'smooth'/);
});
