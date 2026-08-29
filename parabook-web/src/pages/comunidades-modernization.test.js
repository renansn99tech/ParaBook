import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pagina = readFileSync(new URL('./Comunidades.jsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../components/CardComunidade.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/comunidade.css', import.meta.url), 'utf8');

test('Comunidades.jsx não usa cor hex literal', () => {
  assert.doesNotMatch(pagina, /#[0-9a-fA-F]{3,8}\b/);
});

test('hero existe e não abriga botão de criar', () => {
  assert.match(pagina, /className="com-hero"/);
  const hero = pagina.match(/<header className="com-hero"[\s\S]*?<\/header>/);
  assert.ok(hero, 'bloco do hero deve ser encontrado');
  assert.doesNotMatch(hero[0], /criar/i);
});

test('título do hero é editorial (--fonte-editorial)', () => {
  assert.match(pagina, /<h1 className="com-hero-titulo"/);
  assert.match(css, /\.com-hero-titulo\s*\{[\s\S]*?font-family:\s*var\(--fonte-editorial\)/);
});

test('filtros expõem aria-pressed', () => {
  assert.match(pagina, /aria-pressed=\{filtro === id\}/);
});

test('card traz monograma, lotação e role="progressbar"', () => {
  assert.match(card, /comunidade-monograma/);
  assert.match(card, /comunidade-lotacao/);
  assert.match(card, /role="progressbar"/);
});

test('selo de denúncia é atrelado a is_superuser', () => {
  assert.match(card, /is_superuser[\s\S]*?total_denuncias/);
  assert.match(card, /comunidade-selo--denuncia/);
});

test('CSS não declara :root e usa variáveis --com-', () => {
  assert.doesNotMatch(css, /:root/);
  assert.match(css, /--com-barra/);
});

test('CSS trata prefers-reduced-motion', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('autoria de comunidade usa sistema, username ou fallback legado', () => {
  assert.match(card, /Criado por Sistema do ParaBook/);
  assert.match(card, /Criado por <span className="comunidade-autoria-nome">@\{comunidade\.criador_nome\}<\/span>/);
  assert.match(card, /Criado por <CriadorDesconhecido \/>/);
});

test('fallback legado explica a ausência de criador no hover e no foco', () => {
  const componente = readFileSync(new URL('../components/CriadorDesconhecido.jsx', import.meta.url), 'utf8');
  const tooltipCss = readFileSync(new URL('../assets/css/criador-comunidade.css', import.meta.url), 'utf8');
  assert.match(componente, /data-tooltip=\{EXPLICACAO_CRIADOR_DESCONHECIDO\}/);
  assert.match(componente, /tabIndex="0"/);
  assert.match(componente, /registro legado e não possui um criador rastreável/);
  assert.match(tooltipCss, /\.criador-desconhecido:hover::after/);
  assert.match(tooltipCss, /\.criador-desconhecido:focus-visible::after/);
});
