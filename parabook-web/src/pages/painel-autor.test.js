import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const painel = ler('./PainelAutor.jsx');
const abas = ler('../components/autor/AbasPainel.jsx');
const bloqueio = ler('../components/autor/BloqueioPro.jsx');
const grafico = ler('../components/autor/GraficoLinha.jsx');
const css = ler('../assets/css/painel-autor.css');
const app = ler('../App.jsx');
const navbar = ler('../components/Navbar.jsx');
const profile = ler('./Profile.jsx');
const leitura = ler('./Leitura.jsx');
const acessibilidade = ler('../components/RouteAccessibility.jsx');
const transicaoRota = ler('../hooks/useViewTransitionLocation.js');

test('painel possui rota privada e título acessível próprio', () => {
  assert.match(app, /const PainelAutor = lazy/);
  assert.match(app, /path="\/autor\/painel" element=\{<RotaPublicacao><PainelAutor \/><\/RotaPublicacao>\}/);
  assert.match(acessibilidade, /\['\/autor\/painel', 'Painel do Autor'\]/);
  assert.match(transicaoRota, /displayLocation\.search === location\.search/);
  assert.match(transicaoRota, /setDisplayLocation\(location\)/);
});

test('visão geral consulta dados reais, cancela resposta antiga e exporta CSV', () => {
  assert.match(painel, /new AbortController\(\)/);
  assert.match(painel, /signal: controller\.signal/);
  assert.match(painel, /controller\.abort\(\)/);
  assert.match(painel, /\/biblioteca\/autor\/analytics\/resumo\//);
  assert.match(painel, /\/biblioteca\/autor\/analytics\/exportar\//);
  assert.match(painel, /responseType: 'blob'/);
  assert.match(painel, /<Skeleton/);
  assert.match(painel, /Não conseguimos carregar seus números agora/);
});

test('abas seguem o padrão ARIA e Analytics Pro permanece disponível como em breve', () => {
  assert.match(abas, /role="tablist"/);
  assert.match(abas, /role="tab"/);
  assert.match(abas, /aria-selected=/);
  assert.match(abas, /ArrowRight/);
  assert.match(abas, /ArrowLeft/);
  assert.match(abas, /evento\.key === 'Home'/);
  assert.match(abas, /evento\.key === 'End'/);
  assert.match(bloqueio, /EM BREVE/);
  assert.match(bloqueio, /inert=/);
  assert.match(bloqueio, /aria-hidden="true"/);
  assert.match(css, /filter: blur\(7px\)/);
  assert.doesNotMatch(`${painel}\n${bloqueio}`, /R\$\s*\d|Ativar Autor Pro|\/planos/);
});

test('gráfico oferece descrição textual e pontos focalizáveis', () => {
  assert.match(grafico, /aria-label=\{`\$\{ponto\.rotulo\}, \$\{ponto\.valor\} leituras`\}/);
  assert.match(grafico, /tabIndex="0"/);
  assert.match(grafico, /<title>/);
  assert.match(grafico, /Nenhuma leitura registrada neste período/);
});

test('autores publicam pela Navbar e acessam o painel pelo perfil', () => {
  assert.match(navbar, /user\?\.tipo === 'autor'[\s\S]*?to="\/publicar" className="navbar-publicar-livro"/);
  assert.match(navbar, /> Publicar Livro<\/Link>/);
  assert.match(profile, /to="\/autor\/painel" className="btn-primary-action"/);
  assert.match(profile, /> Acessar Painel<\/Link>/);
  assert.doesNotMatch(profile, /autor-panel[\s\S]{0,600}> Publicar novo livro<\/Link>/);
});

test('leitor registra sessão e eventos sem confiar no percentual do cliente', () => {
  assert.match(leitura, /sessaoLeituraRef/);
  assert.match(leitura, /crypto\?\.randomUUID/);
  assert.match(leitura, /\/biblioteca\/leitura\/eventos\//);
  assert.match(leitura, /duracao_segundos/);
  assert.match(leitura, /pagehide/);
  assert.match(leitura, /visibilitychange/);
});

test('estilos novos usam somente tokens e tratam responsividade e movimento reduzido', () => {
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}/);
  assert.match(css, /var\(--vela\)/);
  assert.match(css, /var\(--purple\)/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /min-height: var\(--touch-target\)/);
});
