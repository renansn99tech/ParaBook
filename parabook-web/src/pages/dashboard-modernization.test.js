import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const dashboard = ler('./Dashboard.jsx');
const aprovacoes = ler('../components/admin/AdminAprovacoes.jsx');
const denuncias = ler('../components/admin/AdminDenuncias.jsx');
const lixeira = ler('../components/admin/AdminLixeira.jsx');
const usuarios = ler('../components/admin/AdminUsuarios.jsx');
const paleta = ler('../components/admin/PaletaComandosAdmin.jsx');
const css = ler('../assets/css/admin.css');

test('resumo do turno nasce de uma chamada e alimenta contadores sem badge zero', () => {
  assert.match(dashboard, /api\.get\('\/dashboard\/estatisticas\/'\)/);
  assert.match(dashboard, /useEffect\(\(\) => \{ carregarResumo\(\); \}, \[carregarResumo\]\)/);
  assert.match(dashboard, /pendencias: \{ aprovacoes: 0, denuncias: 0, lixeira: 0 \}/);
  assert.match(dashboard, /item\.contador > 0 && <span className=\{`nav-contador/);
  assert.doesNotMatch(dashboard, /alerta-zero/);
});

test('visão geral prioriza decisões, KPIs navegáveis, setup comprovável e auditoria', () => {
  assert.match(dashboard, /'Resolver agora'/);
  assert.match(dashboard, />Nada esperando por você</);
  assert.match(dashboard, /setResumo\(\(atual\) =>/);
  assert.match(dashboard, /rotulo="Alertas"[\s\S]*?denuncias_abertas/);
  assert.match(dashboard, /comunidades_oficiais > 0/);
  assert.match(dashboard, /\/perfil\/configuracoes\/auditoria/);
  assert.match(dashboard, /useContagem\(valor, animar\)/);
});

test('filas usam SweetAlert, atualização otimista e restauração em erro', () => {
  for (const fonte of [aprovacoes, denuncias, lixeira]) {
    assert.match(fonte, /from '..\/..\/services\/swal'/);
    assert.match(fonte, /onFilaAlterada/);
    assert.match(fonte, /onNotificar/);
    assert.doesNotMatch(fonte, /window\.confirm|window\.alert|window\.location\.reload/);
  }
  assert.match(aprovacoes, /inputValidator: \(valor\) => valor\.trim\(\)/);
  assert.match(aprovacoes, /const \[filtroFila, setFiltroFila\]/);
  assert.match(denuncias, /dash-fila-card--denuncia/);
  assert.match(lixeira, /Excluir permanentemente\?/);
});

test('usuários mantêm busca e filtro próprios, motivo de vazio e exportação segura', () => {
  assert.match(usuarios, /const \[filtroUsuarios, setFiltroUsuarios\]/);
  assert.match(usuarios, /Nome, @usuário ou e-mail/);
  assert.match(usuarios, /Nenhum resultado para/);
  assert.match(usuarios, /Limpar busca e filtro/);
  assert.match(usuarios, /\^\[=\+\\-@\]/);
  assert.match(usuarios, /Exportar lista/);
  assert.doesNotMatch(usuarios, /<img/);
});

test('paleta abre por Ctrl ou Command K e devolve o foco ao fechar', () => {
  assert.match(dashboard, /evento\.ctrlKey \|\| evento\.metaKey/);
  assert.match(paleta, /role="dialog" aria-modal="true"/);
  assert.match(paleta, /ArrowDown/);
  assert.match(paleta, /ArrowUp/);
  assert.match(paleta, /evento\.key === 'Escape'/);
  assert.match(paleta, /focoAnteriorRef\.current\?\.focus\(\)/);
});

test('cores semânticas, toque, responsividade e movimento reduzido ficam explícitos', () => {
  assert.match(css, /nav-contador--denuncias[\s\S]*?background:var\(--warning\)/);
  assert.match(css, /dash-fila-card--autoria[\s\S]*?border-left-color:var\(--vela\)/);
  assert.match(css, /dash-fila-card--lixeira[\s\S]*?border-left-color:var\(--danger\)/);
  assert.match(css, /min-height:var\(--touch-target\)/);
  assert.match(css, /@media \(max-width:992px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
});
