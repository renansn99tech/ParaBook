import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const coordenador = readFileSync(new URL('../Home.jsx', import.meta.url), 'utf8');
const desktop = readFileSync(new URL('./HomeDesktop.jsx', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('./HomeMobile.jsx', import.meta.url), 'utf8');
const mobileCss = readFileSync(new URL('../../assets/css/home-mobile.css', import.meta.url), 'utf8');
const mobileRootCss = mobileCss.match(/\.home-mobile\s*\{([\s\S]*?)\}/)?.[1] || '';

test('Home escolhe composições independentes no breakpoint da navegação', () => {
  assert.match(coordenador, /lazy\(\(\) => import\('\.\/home\/HomeDesktop'\)\)/);
  assert.match(coordenador, /lazy\(\(\) => import\('\.\/home\/HomeMobile'\)\)/);
  assert.match(coordenador, /max-width: 1199\.98px/);
});

test('dados da Home são compartilhados antes da escolha visual', () => {
  assert.match(coordenador, /const dados = useHomeData\(\)/);
  assert.match(coordenador, /<Composicao \{\.\.\.dados\} \/>/);
});

test('landing móvel não importa imagens narrativas pesadas do desktop', () => {
  assert.match(mobile, /open-book-480\.webp/);
  assert.doesNotMatch(mobile, /open-book-1200|leitora-|autor-/);
  assert.match(desktop, /home-ceus\.css/);
});

test('cards móveis preservam dimensões, lazy loading e destinos funcionais', () => {
  assert.match(mobile, /width="300"\s+height="420"\s+loading="lazy"/);
  assert.match(mobile, /to=\{`\/livro\/\$\{livro\.id\}`\}/);
  assert.match(mobile, /to=\{`\/comunidade\/\$\{comunidade\.id\}\/conteudo`\}/);
});

test('hero móvel reduz o respiro superior e centraliza a cena estática', () => {
  assert.match(mobileCss, /\.hm-hero\s*\{[\s\S]*align-content:start;[\s\S]*padding:clamp\(1\.75rem, 7vw, 2rem\)/);
  assert.match(mobileCss, /stars-bg-768\.webp/);
  assert.match(mobileCss, /\.hm-hero-art img\s*\{[\s\S]*left:50%;[\s\S]*top:50%;[\s\S]*transform:translate\(-50%, -48%\)/);
});

test('cena móvel é full-bleed e aplica vinheta temática nas quatro bordas', () => {
  assert.match(mobileCss, /\.hm-hero-art\s*\{[\s\S]*width:100vw;[\s\S]*calc\(50% - 50vw\)/);
  assert.match(mobileCss, /\.hm-intro-cosmos::after\s*\{[\s\S]*radial-gradient/);
  assert.match(mobileCss, /\.hm-intro-cosmos::after\s*\{[\s\S]*linear-gradient\([\s\S]*rgba\(var\(--bg-main-rgb\),\.76\) 0%/);
  assert.match(mobileCss, /\.hm-quick::before\s*\{[\s\S]*top:1rem;[\s\S]*rgba\(var\(--bg-main-rgb\),\.62\) 58%,[\s\S]*var\(--bg-main\) 100%/);
  assert.match(mobileCss, /--hm-vignette-alpha:\.5/);
  assert.match(mobileCss, /:root\[data-tema="tarde"\] \.home-mobile/);
  assert.match(mobileCss, /:root\[data-tema="claro"\] \.home-mobile/);
});

test('tema claro reforça o contraste do destaque editorial', () => {
  assert.match(mobileCss, /:root\[data-tema="claro"\] \.hm-eyebrow\s*\{[\s\S]*color:#8f5200/);
});

test('céu temático cobre hero, livro e atalhos até antes das novidades', () => {
  assert.match(mobile, /<div className="hm-intro-cosmos">[\s\S]*<section className="hm-hero"[\s\S]*<nav className="hm-quick"[\s\S]*<\/div>[\s\S]*<section className="hm-section"/);
  assert.match(mobileCss, /\.hm-intro-cosmos\s*\{[\s\S]*var\(--hm-cosmos-image\) center\/cover no-repeat/);
  const artCss = mobileCss.match(/\.hm-hero-art\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.doesNotMatch(artCss, /background:/);
});

test('temas tarde e claro possuem fundos cósmicos estáticos próprios', () => {
  assert.match(mobileCss, /hero-cosmos-tarde-mobile-portrait\.webp/);
  assert.match(mobileCss, /hero-cosmos-dia-mobile-portrait\.webp/);
  assert.ok(existsSync(new URL('../../assets/img/hero-cosmos-tarde-mobile-portrait.webp', import.meta.url)));
  assert.ok(existsSync(new URL('../../assets/img/hero-cosmos-dia-mobile-portrait.webp', import.meta.url)));
});

test('fundo da Home móvel não usa halo radial que se desloca durante o scroll', () => {
  assert.match(mobileRootCss, /background:var\(--bg-main\)/);
  assert.doesNotMatch(mobileRootCss, /radial-gradient/);
});
