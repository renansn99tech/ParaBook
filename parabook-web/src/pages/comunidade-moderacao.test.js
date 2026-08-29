import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const conteudo = readFileSync(new URL('./ConteudoComunidade.jsx', import.meta.url), 'utf8');
const painel = readFileSync(new URL('./PainelDenunciasComunidade.jsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('./Dashboard.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/painel-denuncias-comunidade.css', import.meta.url), 'utf8');

test('admin pode publicar e responder sem participar como membro', () => {
  assert.match(conteudo, /const podePublicar = membro \|\| admin/);
  assert.match(conteudo, /podePublicar && \(!comunidade\.em_manutencao \|\| admin\)/);
  assert.match(conteudo, /Criar nova postagem/);
});

test('card lateral busca denúncias específicas e oferece fallback explícito', () => {
  assert.match(conteudo, /api\.get\(`\/dashboard\/denuncias\/comunidades\/\$\{id\}\/`\)/);
  assert.match(conteudo, /cc-denuncias-resumo/);
  assert.match(conteudo, /Nenhuma denúncia pendente/);
  assert.match(conteudo, /Abrir painel de denúncias/);
});

test('painel específico fica protegido pela guarda administrativa', () => {
  assert.match(app, /path="\/comunidade\/:id\/denuncias" element=\{<RotaAdmin><PainelDenunciasComunidade \/><\/RotaAdmin>\}/);
});

test('painel apresenta métricas, fila e histórico reais', () => {
  assert.match(painel, /resumo\.pendentes/);
  assert.match(painel, /resumo\.acolhidas/);
  assert.match(painel, /resumo\.arquivadas/);
  assert.match(painel, /historico\.map/);
});

test('decisão rápida permite falso positivo e acolhimento pelo endpoint vigente', () => {
  assert.match(painel, /Arquivar como falso positivo/);
  assert.match(painel, /api\.post\(`\/dashboard\/moderacao\/comunidade\/\$\{denuncia\.id\}\/`, \{ acao \}\)/);
  assert.match(painel, /decidir\(denuncia, 'recusar'\)/);
  assert.match(painel, /decidir\(denuncia, 'aprovar'\)/);
});

test('painel abre diretamente a aba geral de denúncias do dashboard', () => {
  assert.match(painel, /to="\/dashboard\?aba=denuncias"/);
  assert.match(dashboard, /new URLSearchParams\(location\.search\)\.get\('aba'\)/);
  assert.match(dashboard, /ABAS_DASHBOARD\.includes\(abaSolicitada\)/);
});

test('estado vazio do painel mantém atalho para a fila geral', () => {
  assert.match(painel, /Nenhuma denúncia pendente/);
  assert.match(painel, /Ver denúncias de toda a plataforma/);
});

test('CSS do painel usa tokens, layout 340px e responsividade', () => {
  assert.doesNotMatch(css, /#[\da-f]{3,8}\b/i);
  assert.doesNotMatch(css, /:root/);
  assert.match(css, /\.pdc-pagina\s*\{[\s\S]*?--pdc-/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 340px/);
  assert.match(css, /@media \(max-width: 1024px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('contador de pendências usa algarismo 50% maior', () => {
  assert.match(css, /\.pdc-contador\s*\{[^}]*font-size: 1\.14rem/);
});

test('círculo do contador de pendências é 30% maior', () => {
  assert.match(css, /\.pdc-contador\s*\{[^}]*min-width: 41\.6px;[^}]*height: 41\.6px/);
});
