import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const profile = readFileSync(new URL('./Profile.jsx', import.meta.url), 'utf8');
const configuracoes = readFileSync(new URL('../components/ConfiguracoesAvancadas.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/perfil.css', import.meta.url), 'utf8');
const centralConta = readFileSync(new URL('./CentralConta.jsx', import.meta.url), 'utf8');
const paginaConfiguracoes = readFileSync(new URL('./ConfiguracoesAvancadas.jsx', import.meta.url), 'utf8');

test('abas do perfil são linkáveis e expõem semântica de tab acessível', () => {
  assert.match(profile, /useSearchParams/);
  assert.match(profile, /role="tablist"/);
  assert.match(profile, /role="tab"/);
  assert.match(profile, /aria-selected=/);
  assert.match(profile, /ArrowLeft/);
  assert.match(profile, /ArrowRight/);
  assert.match(profile, /setActiveTab\(tab\)/);
});

test('histórico antecede informações e concentra a atividade recente', () => {
  assert.match(profile, /id: 'historico'[\s\S]*?id: 'info'/);
  assert.match(profile, /api\.get\('\/perfis\/historico\/'\)/);
  assert.match(profile, /activeTab === 'historico'/);
  assert.match(profile, /livro: \{ icone: 'fa-book-open' \}/);
  assert.match(profile, /avaliacao: \{ icone: 'fa-star' \}/);
  assert.match(profile, /comunidade: \{ icone: 'fa-comments' \}/);
  assert.match(profile, /conquista: \{ icone: 'fa-trophy' \}/);
  assert.match(profile, /perfil-info-grid--sobre/);
  assert.doesNotMatch(profile, /setNotificacoes/);
  assert.doesNotMatch(profile, /historico-perfil-resumo/);
  assert.doesNotMatch(profile, /registros recentes/);
  assert.match(css, /\.historico-perfil-lista/);
  assert.match(css, /\.historico-evento > a\s*\{[\s\S]*?grid-template-columns: 54px minmax\(0, 1fr\)/);
  assert.match(css, /\.historico-perfil > \.perfil-vazio\s*\{[\s\S]*?border: 0/);
});

test('informações oferece edição parcial, privacidade e drawers literários', () => {
  assert.match(profile, /Sua biografia \(até 800 caracteres\)/);
  assert.match(profile, /maxlength: '800'/);
  assert.match(profile, /> Editar Informações /);
  assert.match(profile, />Editar Biografia<\/strong>/);
  assert.match(profile, />Editar Dados<\/strong>/);
  assert.match(profile, /data_nascimento: document\.getElementById/);
  assert.match(profile, /exibir_idade:/);
  assert.match(profile, /exibir_data_nascimento:/);
  assert.match(profile, /exibir_email:/);
  assert.match(profile, /Ocultar todos os dados/);
  assert.match(profile, /> Idade<\/dt>/);
  assert.match(profile, /> Aniversário<\/dt>/);
  assert.match(profile, /> E-mail<\/dt>/);
  assert.match(profile, /'Privado'/);
  assert.match(profile, /abrirDrawerAtividade\(evento, 'livros'\)/);
  assert.match(profile, /abrirDrawerAtividade\(evento, 'avaliacoes'\)/);
  assert.match(profile, /historicoRecentes\[drawerAtividade\]\.map/);
  assert.doesNotMatch(profile, /to="\/minha-biblioteca"/);
  assert.match(profile, /stats\.total_lidos/);
  assert.match(profile, /stats\.total_avaliados/);
  assert.match(css, /\.perfil-info-grid--moderno \.sobre-texto\s*\{[\s\S]*?max-width: none/);
  assert.match(css, /\.perfil-dados-pessoais/);
  assert.match(css, /\.perfil-info-atalhos/);
  assert.match(css, /\.perfil-edicao-menu\.is-open/);
  assert.match(css, /\.perfil-atividade-drawer\.is-open/);
});

test('operações comuns atualizam o perfil sem recarregar toda a SPA', () => {
  assert.doesNotMatch(profile, /window\.location\.reload/);
  assert.doesNotMatch(profile, />Editar perfil</);
  assert.match(profile, /role="status"/);
});

test('configurações avançadas usam card estático e rota própria', () => {
  assert.match(profile, /to="\/perfil\/configuracoes" className="config-avancado-toggle-estado"/);
  assert.doesNotMatch(profile, /avancadoAberto/);
  assert.doesNotMatch(profile, /config-avancado[^\n]*aria-expanded=/);
  assert.match(app, /path="\/perfil\/configuracoes"/);
  assert.match(configuracoes, /adminAutorizado/);
  assert.match(configuracoes, /aria-disabled="true"/);
  assert.match(app, /path="\/perfil\/configuracoes\/:secao"/);
  assert.doesNotMatch(centralConta, /\/auth\/sessoes\//);
  assert.doesNotMatch(centralConta, /\/auth\/dois-fatores\//);
  assert.doesNotMatch(centralConta, /\/auth\/exportar-dados\//);
  assert.match(configuracoes, /titulo="Sessões e dispositivos" indisponivel/);
  assert.match(configuracoes, /titulo="Verificação em duas etapas" indisponivel/);
  assert.match(configuracoes, /titulo="Exportar meus dados \(LGPD\)" indisponivel/);
  assert.match(configuracoes, />EM BREVE</);
  assert.doesNotMatch(profile, /\/auth\/excluir-conta\//);
  assert.match(paginaConfiguracoes, /\/auth\/excluir-conta\//);
  assert.match(paginaConfiguracoes, /configuracoes-page-danger/);
});

test('painel de leitura e meta anual refletem os novos estados visuais', () => {
  assert.match(profile, />Retomar Leitura</);
  assert.doesNotMatch(profile, />Explorar a Biblioteca<\/Link>/);
  assert.match(profile, /perfil-meta-config-controle/);
  assert.match(profile, /perfil-meta-stepper/);
  assert.match(profile, /perfil-tipografia-config/);
  assert.match(profile, /user\?\.tipografia_nome \|\| 'ParaBook Original'/);
  assert.match(profile, /to="\/perfil\/configuracoes\/aparencia" className="perfil-tipografia-atalho"/);
  assert.match(profile, /aria-label="Aumentar meta anual"/);
  assert.match(profile, /aria-label="Diminuir meta anual"/);
  assert.match(css, /\.perfil-meta-stepper > button:hover/);
  assert.match(css, /::-webkit-inner-spin-button/);
  assert.match(css, /\.perfil-meta-anual[\s\S]*?rgba\(var\(--vela-rgb\), \.24\)/);
});

test('card de identidade mantém divisória e chip permanente do último lido', () => {
  assert.match(profile, /className="perfil-info-divisor"/);
  assert.match(profile, /perfil-chip--ultimo/);
  assert.match(profile, /ultimoLido \|\| 'Nenhuma leitura concluída'/);
  assert.match(css, /\.perfil-info-divisor/);
});

test('card de identidade resume interesses derivados da atividade', () => {
  assert.match(profile, /id="perfil-interesses-titulo">Interesses/);
  assert.match(profile, /> Gêneros mais acessados<\/span>/);
  assert.match(profile, /> Comunidades em que mais participa<\/span>/);
  assert.match(profile, /'Recomendação do Autor' : 'Recomendação do Leitor'/);
  assert.match(profile, /to={`\/comunidade\/\$\{comunidade\.id\}\/conteudo`}/);
  assert.match(profile, /to={`\/livro\/\$\{recomendacaoInteresse\.id\}`}/);
  assert.match(css, /\.perfil-interesses-grid\s*{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.perfil-interesse-bloco--recomendacao/);
});

test('redesign fica escopado ao perfil autenticado e respeita movimento reduzido', () => {
  assert.match(profile, /perfil-page--proprio/);
  assert.match(css, /\.perfil-page--proprio/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /--pf-xp/);
  assert.match(css, /\.perfil-page--proprio \.perfil-cover::after[\s\S]*?display: none/);
});

test('composição desktop respeita a largura da capa com cards mais compactos', () => {
  assert.match(css, /\.perfil-page\s*{[\s\S]*?padding: 30px 45px/);
  assert.match(css, /\.perfil-page--proprio \.perfil-content-wrapper\s*{[\s\S]*?width: 100%;[\s\S]*?max-width: 100%;[\s\S]*?box-sizing: border-box;[\s\S]*?padding-inline: 0;[\s\S]*?gap: 20\.8px/);
  assert.match(css, /@media \(min-width: 993px\)[\s\S]*?\.perfil-page--proprio \.perfil-content-wrapper\s*{[\s\S]*?width: 97%;[\s\S]*?margin-inline: auto/);
  assert.match(css, /@media \(min-width: 1400px\)[\s\S]*?width: min\(var\(--layout-max\), calc\(100% - 48px\)\)/);
  assert.match(css, /@media \(min-width: 1400px\)[\s\S]*?grid-template-columns: auto minmax\(0, 1fr\) 361px/);
  assert.match(css, /\.perfil-page--proprio \.perfil-main-info\s*{[\s\S]*?padding: 28\.5px/);
  assert.match(css, /\.perfil-page--proprio \.perfil-painel\s*{[\s\S]*?padding: 22\.8px/);
});

test('perfil usa o avatar padrão próprio do ParaBook', () => {
  assert.match(profile, /avatar-padrao-parabook\.webp/);
  assert.doesNotMatch(profile, /assets\/img\/user\.png/);
});
