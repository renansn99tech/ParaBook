import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const pagina = ler('./Biblioteca.jsx');
const css = ler('../assets/css/biblioteca.css');
const mock = ler('../mocks/mockAcervoBeta.js');
const flagsAdmin = ler('./admin/AdminFeatureFlags.jsx');

test('catálogo, categorias e flag pública são carregados juntos com fallback seguro', () => {
  assert.match(pagina, /Promise\.all\(\[api\.get\('\/biblioteca\/livros\/', \{ signal: controller\.signal \}\), api\.get\('\/biblioteca\/categorias\/', \{ signal: controller\.signal \}\), api\.get\('\/dashboard\/feature-flags\/publicas\/', \{ signal: controller\.signal \}\)/);
  assert.match(pagina, /livrosRes\.data\.results \|\| livrosRes\.data/);
  assert.match(pagina, /categoriasRes\.data\.results \|\| categoriasRes\.data/);
  assert.match(pagina, /payload\?\.acervo_avancado_beta === true/);
  assert.match(pagina, /catch\(\(\) => \(\{ data: \{\} \}\)\)/);
  assert.match(pagina, /return \(\) => controller\.abort\(\)/);
});

test('origem independente é selo e filtro, nunca categoria ou agrupamento próprio', () => {
  assert.match(pagina, /livro\.selo_independente \|\| livro\.origem === 'autor_independente'/);
  assert.match(pagina, /Autores independentes/);
  assert.doesNotMatch(pagina, /['"]Independentes['"]/);
});

test('resolverAcaoLivro mantém os seis ramos e a precedência do backend', () => {
  const inicio = pagina.indexOf('export function resolverAcaoLivro');
  const fim = pagina.indexOf('export function formatarVigencia');
  const helper = pagina.slice(inicio, fim);
  const ramos = ['acesso.pode_ler', "acesso.codigo === 'requer_autenticacao'", 'acesso.requer_assinatura', 'acesso.pode_ler_amostra', "'vigencia_encerrada'", "rotulo: 'Indisponível'"];
  ramos.reduce((anterior, ramo) => {
    const atual = helper.indexOf(ramo);
    assert.ok(atual > anterior, `${ramo} precisa manter a precedência contratada`);
    return atual;
  }, -1);
});

test('estilos e JSX não introduzem hex literal nem variáveis globais', () => {
  assert.doesNotMatch(`${pagina}\n${css}`, /#[\da-f]{3,8}\b/i);
  assert.doesNotMatch(css, /:root/);
  assert.match(css, /\.pagina-biblioteca\s*\{[\s\S]*?--bib-/);
});

test('filtros e diálogos expõem semântica e controles de teclado', () => {
  assert.match(pagina, /aria-pressed=\{filtros\[eixo\] === valor\}/);
  assert.match(pagina, /aria-expanded=\{aberto\}/);
  assert.match(pagina, /role="dialog" aria-modal="true"/);
  assert.match(pagina, /evento\.key === 'Escape'/);
  assert.match(pagina, /evento\.key !== 'Tab'/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('mobile mantém filtros ativos removíveis e diálogos seguros no Safari', () => {
  assert.match(pagina, /className="bib-filtros-ativos"/);
  assert.match(pagina, /aria-label=\{`Remover filtro \$\{filtro\.rotulo\}`\}/);
  assert.match(pagina, /document\.body\.style\.position = 'fixed'/);
  assert.match(pagina, /window\.scrollTo\(0, scrollY\)/);
  assert.match(css, /\.bib-busca input \{ font-size: 1rem; \}/);
  assert.match(css, /max-height: 90dvh/);
  assert.match(css, /var\(--safe-bottom\)/);
});

test('mock só entra pela camada Beta e não cria obras no catálogo', () => {
  assert.match(pagina, /function AcervoAvancadoBeta/);
  assert.match(pagina, /import\('\.\.\/mocks\/mockAcervoBeta'\)/);
  assert.equal(pagina.match(/import\('\.\.\/mocks\/mockAcervoBeta'\)/g)?.length, 1);
  assert.match(pagina, /\.map\(\(id\) => porId\.get\(String\(id\)\)\)\.filter\(Boolean\)/);
  assert.match(mock, /demonstrativo: true/);
});

test('camada B não contém integração financeira nem recalcula Premium', () => {
  assert.doesNotMatch(pagina, /Stripe|pedido|carteira|saldo/i);
  assert.doesNotMatch(pagina, /modelo_acesso === 'assinante'[\s\S]{0,100}Ler obra/);
  assert.match(pagina, /const acao = resolverAcaoLivro\(livro\)/);
});

test('flag Beta está apresentada ao admin e a composição preserva a base', () => {
  assert.match(flagsAdmin, /acervo_avancado_beta:[\s\S]*?nome: 'Acervo avançado Beta'/);
  assert.match(pagina, /<BibliotecaBase[\s\S]*?\{acervoAvancadoBeta && <AcervoAvancadoBeta/);
  assert.match(pagina, /Experimentos temporariamente indisponíveis\./);
});
