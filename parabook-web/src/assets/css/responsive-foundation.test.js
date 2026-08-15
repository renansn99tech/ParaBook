import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (url) => readFileSync(fileURLToPath(url), 'utf8');
const indexHtml = ler(new URL('../../../index.html', import.meta.url));
const baseCss = ler(new URL('./base.css', import.meta.url));
const navbarCss = ler(new URL('./navbar.css', import.meta.url));

test('documento declara idioma e viewport que cobre as safe areas', () => {
  assert.match(indexHtml, /<html\s+lang="pt-BR">/);
  assert.match(indexHtml, /content="[^"]*width=device-width[^"]*viewport-fit=cover[^"]*"/);
  assert.doesNotMatch(indexHtml, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
});

test('fundação móvel expõe safe areas e unidades modernas de viewport', () => {
  for (const token of ['--safe-top', '--safe-right', '--safe-bottom', '--safe-left']) {
    assert.ok(baseCss.includes(`${token}:env(safe-area-inset-`), `${token} precisa usar env()`);
  }

  assert.match(baseCss, /min-height:100svh/);
  assert.match(navbarCss, /height:100dvh/);
  assert.match(navbarCss, /max\(var\(--layout-gutter\), var\(--safe-left\)\)/);
});

test('assets pesados da interface foram substituídos por variantes WebP', () => {
  const fontes = [
    ler(new URL('../../components/Navbar.jsx', import.meta.url)),
    ler(new URL('../../pages/Home.jsx', import.meta.url)),
    ler(new URL('../../pages/Register.jsx', import.meta.url)),
    ler(new URL('./home.css', import.meta.url)),
    ler(new URL('./home-ceus.css', import.meta.url)),
    ler(new URL('./tela-login.css', import.meta.url)),
  ].join('\n');

  assert.doesNotMatch(
    fontes,
    /from\s+['"][^'"]*(?:logo-nova|open-book|leitora|autor)\.png|url\([^)]*(?:stars-bg|logo-parabook-bg)\.png/,
  );

  const webps = [
    'logo-nova-320.webp',
    'open-book-1200.webp',
    'leitora-1200.webp',
    'autor-1200.webp',
    'stars-bg-1536.webp',
    'logo-parabook-bg-1536.webp',
  ];

  const total = webps.reduce((bytes, nome) => {
    const caminho = fileURLToPath(new URL(`../img/${nome}`, import.meta.url));
    return bytes + statSync(caminho).size;
  }, 0);

  assert.ok(total < 550_000, `variantes máximas somam ${total} bytes; orçamento é 550 KB`);
});
