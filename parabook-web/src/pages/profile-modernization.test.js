import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const profile = readFileSync(new URL('./Profile.jsx', import.meta.url), 'utf8');
const configuracoes = readFileSync(new URL('../components/ConfiguracoesAvancadas.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/perfil.css', import.meta.url), 'utf8');
const centralConta = readFileSync(new URL('./CentralConta.jsx', import.meta.url), 'utf8');
const paginaConfiguracoes = readFileSync(new URL('./ConfiguracoesAvancadas.jsx', import.meta.url), 'utf8');
const perfilPublico = readFileSync(new URL('./PerfilPublico.jsx', import.meta.url), 'utf8');
const navbar = readFileSync(new URL('../components/Navbar.jsx', import.meta.url), 'utf8');
const shellAdmin = readFileSync(new URL('../components/admin/AdminAvancadoShell.jsx', import.meta.url), 'utf8');
const avatarPerfil = readFileSync(new URL('../services/avatarPerfil.js', import.meta.url), 'utf8');

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
  assert.match(profile, /Privado para o público/);
  assert.match(profile, /DadoPessoalProprio/);
  assert.match(perfilPublico, /valorPublico\(pessoais\.exibir_idade/);
  assert.match(perfilPublico, /pessoais\.exibir_data_nascimento === false \? 'Privado'/);
  assert.match(perfilPublico, /valorPublico\(pessoais\.exibir_email/);
  assert.match(css, /\.perfil-dado-privado/);
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
  assert.match(configuracoes, /estado="Perfil Administrativo · Visualização totalmente privativa"/);
  assert.match(configuracoes, /tooltip="Somente outros administradores podem visualizar o perfil\."/);
  assert.match(configuracoes, /role="tooltip"/);
  assert.match(configuracoes, /aria-describedby=\{tooltipId\}/);
  assert.match(css, /\.config-avancado-item\.is-policy:hover \.config-avancado-tooltip/);
  assert.match(css, /\.config-avancado-item\.is-policy:focus-visible \.config-avancado-tooltip/);
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

test('ações de moderação mantêm o padrão visual administrativo dentro do perfil', () => {
  assert.match(profile, /className="moderacao-acoes"/);
  assert.match(profile, /className="admin-btn-mini ok"/);
  assert.match(profile, /className="admin-btn-mini nao"/);
  assert.match(profile, /`\$\{item\.titulo\} se tornará um Autor Independente\.`/);
  assert.match(profile, /text: textoConfirmacao/);
  assert.match(profile, /moderacaoItens\.length > 0 && <Link to="\/dashboard" className="btn-primary-action admin-cta-warm">Abrir Dashboard<\/Link>/);
  assert.match(profile, /onClick=\{handleAtualizarFila\} disabled=\{atualizandoFila\} aria-busy=\{atualizandoFila\}/);
  assert.match(profile, /atualizandoFila \? 'Atualizando\.\.\.' : 'Atualizar Fila'/);
  assert.match(profile, /acao=\{\{ to: '\/dashboard', label: 'Abrir Dashboard', className: 'admin-cta-warm' \}\}/);
  assert.doesNotMatch(profile, /label: 'Ir para o Dashboard'/);
  assert.match(profile, /Promise\.all\(\[[\s\S]*?dashboard\/estatisticas[\s\S]*?dashboard\/aprovacoes[\s\S]*?dashboard\/denuncias/);
  assert.match(css, /\.perfil-page--proprio \.moderacao-acoes \.admin-btn-mini\s*\{/);
  assert.match(css, /\.perfil-page--proprio \.moderacao-acoes \.admin-btn-mini\.ok\s*\{[\s\S]*?--success-rgb/);
  assert.match(css, /\.perfil-page--proprio \.moderacao-acoes \.admin-btn-mini\.nao\s*\{[\s\S]*?--danger-rgb/);
  assert.match(css, /\.perfil-page--proprio \.moderacao-acoes \.admin-btn-mini:focus-visible/);
  assert.match(css, /\.moderacao-cabecalho-acoes\s*\{[\s\S]*?justify-content: flex-end/);
});

test('CTAs administrativos combinam base roxa com destaque quente sem afetar ações comuns', () => {
  assert.match(profile, /className="btn-primary-action admin-cta-warm">Central de Comando/);
  assert.match(profile, /className="btn-primary-action admin-cta-warm">Abrir Dashboard/);
  assert.match(profile, /label: 'Abrir Dashboard', className: 'admin-cta-warm'/);
  assert.match(css, /\.perfil-page--proprio \.admin-cta-warm\s*\{[\s\S]*?rgba\(var\(--vela-rgb\), \.42\)[\s\S]*?linear-gradient\(135deg, var\(--purple\), var\(--purple-dark\)\)/);
  assert.match(css, /\.perfil-page--proprio \.admin-cta-warm:hover/);
  assert.match(css, /\.perfil-page--proprio \.admin-cta-warm:focus-visible/);
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

test('avatar padrão acompanha o tipo de perfil em todas as superfícies', () => {
  assert.match(avatarPerfil, /avatar-padrao-admin-parabook\.webp/);
  assert.match(avatarPerfil, /avatar-padrao-autor-parabook\.webp/);
  assert.match(avatarPerfil, /usuario\?\.tipo === 'admin' \|\| usuario\?\.is_superuser/);
  assert.match(avatarPerfil, /usuario\?\.tipo === 'autor'/);
  assert.match(avatarPerfil, /return avatarLeitor/);
  assert.match(profile, /obterAvatarPerfil\(user, fullProfile\?\.perfil\?\.foto\)/);
  assert.match(perfilPublico, /obterAvatarPerfil\(dados\.usuario, dados\.perfil\.foto\)/);
  assert.match(navbar, /const avatarUsuario = obterAvatarPerfil\(user\)/);
  assert.match(shellAdmin, /obterAvatarPerfil\(user\)/);
  assert.equal(existsSync(new URL('../assets/img/avatar-padrao-admin-parabook.webp', import.meta.url)), true);
  assert.equal(existsSync(new URL('../assets/img/avatar-padrao-autor-parabook.webp', import.meta.url)), true);
  assert.doesNotMatch(profile, /assets\/img\/user\.png/);
});

test('identidade visível usa ADM e Autor sem categoria Pro', () => {
  assert.match(profile, /admin: \['badge-admin', 'fa-shield-halved', 'ADM'\]/);
  assert.match(profile, /autor: \['badge-autor', 'fa-feather-pointed', 'Autor'\]/);
  assert.match(profile, /adminAutorizado \? 'ADM' : user\?\.tipo === 'autor' \? 'Autor'/);
  assert.match(perfilPublico, /badge-admin[\s\S]*?> ADM<\/span>/);
  assert.match(perfilPublico, /badge-autor[\s\S]*?> Autor<\/span>/);
  assert.doesNotMatch(`${profile}\n${perfilPublico}`, /Autor Pro/i);
});

test('perfil móvel preserva troca de capa e transforma atividade em bottom sheet acessível', () => {
  assert.match(css, /\.perfil-page--proprio \.btn-capa\s*\{[\s\S]*?display: inline-flex/);
  assert.doesNotMatch(css, /\.perfil-page--proprio \.perfil-cover-selo,\s*\.perfil-page--proprio \.btn-capa\s*\{\s*display: none/);
  assert.match(profile, /drawerAtividadeRef/);
  assert.match(profile, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(profile, /evento\.key !== 'Tab'/);
  assert.match(css, /\.perfil-atividade-drawer\s*\{[\s\S]*?max-height: min\(88dvh, 760px\)[\s\S]*?transform: translateY\(104%\)/);
});

test('perfil móvel usa capa de 97vw, sobreposição e navegação vertical recolhível', () => {
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.perfil-page--proprio \.perfil-cover\s*\{[\s\S]*?width: 97vw !important;[\s\S]*?height: clamp\(270px, 72vw, 500px\) !important;[\s\S]*?max-height: 500px/);
  assert.match(css, /\.perfil-page--proprio \.perfil-content-wrapper\s*\{[\s\S]*?margin: -100px 0 0 calc\(50% - 46\.5vw\) !important/);
  assert.match(css, /\.perfil-page--proprio \.perfil-sidebar\s*\{[\s\S]*?left: 50%;[\s\S]*?transform: translateX\(-50%\)/);
  assert.match(profile, /menuAbasAberto/);
  assert.match(profile, /className="perfil-tabs-drawer-trigger"/);
  assert.match(profile, /aria-controls="perfilTabsNavegacao"/);
  assert.match(css, /\.perfil-page--proprio \.tabs-nav\s*\{[\s\S]*?display: none;[\s\S]*?flex-direction: column/);
  assert.match(css, /\.perfil-page--proprio \.tabs-nav\.is-open\s*\{\s*display: flex/);
  assert.match(profile, /'ArrowUp', 'ArrowDown', 'Home', 'End'/);
});

test('indicadores administrativos ficam integralmente centralizados no perfil móvel', () => {
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.perfil-page--proprio \.stat-glass-card\s*\{[\s\S]*?align-items: center;[\s\S]*?text-align: center/);
  assert.match(css, /\.perfil-page--proprio \.stat-info\s*\{[\s\S]*?width: 100%;[\s\S]*?text-align: center/);
  assert.match(css, /\.perfil-page--proprio \.stat-number,[\s\S]*?\.perfil-page--proprio \.stat-label\s*\{\s*text-align: center/);
});

test('drawer de abas aberto preserva respiro em relação ao seletor mobile', () => {
  assert.match(css, /\.perfil-page--proprio \.tabs-nav\.is-open\s*\{[\s\S]*?display: flex;[\s\S]*?margin-top: 16px/);
});
