import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const coordenador = readFileSync(new URL('../Home.jsx', import.meta.url), 'utf8');
const desktop = readFileSync(new URL('./HomeDesktop.jsx', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('./HomeMobile.jsx', import.meta.url), 'utf8');
const mobileCss = readFileSync(new URL('../../assets/css/home-mobile.css', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../../components/DashboardLeituraResumo.jsx', import.meta.url), 'utf8');
const dashboardCss = readFileSync(new URL('../../assets/css/home-dashboard.css', import.meta.url), 'utf8');
const homeData = readFileSync(new URL('../../hooks/useHomeData.js', import.meta.url), 'utf8');
const comunidade = readFileSync(new URL('../ConteudoComunidade.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
const experiencia = readFileSync(new URL('../../components/ExperienciaPublica.jsx', import.meta.url), 'utf8');
const experienciaCss = readFileSync(new URL('../../assets/css/experiencia-publica.css', import.meta.url), 'utf8');
const homeCss = readFileSync(new URL('../../assets/css/home.css', import.meta.url), 'utf8');
const proximoCapituloCss = readFileSync(new URL('../../assets/css/home-personalizada.css', import.meta.url), 'utf8');
const proximoCapitulo = readFileSync(new URL('../../components/ProximoCapitulo.jsx', import.meta.url), 'utf8');
const rotaPublicacao = readFileSync(new URL('../../components/RotaPublicacao.jsx', import.meta.url), 'utf8');
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

test('cards da landing usam o resumo autenticado e abrem o dashboard privado', () => {
  assert.match(homeData, /api\.get\('\/perfis\/resumo-leitura\/'/);
  assert.match(desktop, /resumoLeitura\?\.leitura_destaque/);
  assert.match(desktop, /leituraDestaque\.progresso_percentual/);
  assert.match(desktop, /setDashboardAberto\(true\)/);
  assert.match(desktop, /formatarTempoResumo/);
  assert.match(mobile, /className="hm-reading"/);
  assert.match(mobile, /> Abrir dashboard<\/button>/);
});

test('card do usuário usa a foto do perfil com fallback adequado ao papel', () => {
  assert.match(desktop, /import \{ obterAvatarPerfil \} from '\.\.\/\.\.\/services\/avatarPerfil'/);
  assert.match(desktop, /const avatarUsuario = obterAvatarPerfil\(user\)/);
  assert.match(desktop, /className="floating-avatar"[\s\S]*src=\{avatarUsuario\}/);
  assert.doesNotMatch(desktop, /<div className="floating-avatar">👩<\/div>/);
});

test('cards institucionais ganham páginas próprias e são substituídos após login', () => {
  assert.match(app, /path="\/para-leitores"/);
  assert.match(app, /path="\/para-autores"/);
  assert.match(desktop, /!isAuthenticated \? <section className="features"/);
  assert.match(desktop, /<ProximoCapitulo dados=\{inicioPersonalizado\}/);
  assert.match(mobile, /!user && <section className="hm-audiences"/);
  assert.match(experiencia, /Recursos que já fazem parte do ParaBook/);
  assert.match(experiencia, /Analytics do Autor/);
  assert.match(experiencia, /Em breve/);
});

test('páginas institucionais respeitam o container global de 1600px', () => {
  assert.match(experienciaCss, /\.experiencia-page\s*\{[\s\S]*width:100%;[\s\S]*max-width:var\(--layout-max\);[\s\S]*margin:0 auto/);
  assert.match(experienciaCss, /max\(var\(--layout-gutter\), var\(--safe-right\)\)/);
  assert.match(experienciaCss, /max\(var\(--layout-gutter\), var\(--safe-left\)\)/);
});

test('landing alinha cards institucionais e seções seguintes no container de 1600px', () => {
  assert.match(homeCss, /\.features,[\s\S]*\.books,[\s\S]*\.communities\s*\{[\s\S]*width:100%;[\s\S]*max-width:var\(--layout-max\);[\s\S]*var\(--layout-gutter\)/);
  assert.match(proximoCapituloCss, /\.proximo-capitulo\s*\{[\s\S]*width:100%;[\s\S]*max-width:var\(--layout-max\);[\s\S]*var\(--layout-gutter\)/);
});

test('início personalizado usa endpoint privado e ações internas por papel', () => {
  assert.match(homeData, /api\.get\('\/perfis\/inicio\/'/);
  assert.match(proximoCapitulo, /Seu próximo capítulo/);
  assert.match(proximoCapitulo, /Descobertas para você/);
  assert.match(proximoCapitulo, /acao\?\.link \|\| '\/perfil'/);
});

test('rota de publicação impede acesso de visitantes e papéis não aprovados', () => {
  assert.match(app, /<RotaPublicacao><PublicarLivro \/><\/RotaPublicacao>/);
  assert.match(rotaPublicacao, /!user[\s\S]*Navigate to="\/para-autores"/);
  assert.match(rotaPublicacao, /aguardando_aprovacao[\s\S]*Navigate to="\/perfil"/);
  assert.match(rotaPublicacao, /user\.tipo !== 'autor' && user\.tipo !== 'admin'/);
});

test('dashboard breve explica e apresenta as quatro métricas solicitadas', () => {
  assert.match(dashboard, /rotulo="Média por sessão"/);
  assert.match(dashboard, /rotulo="Gêneros explorados"/);
  assert.match(dashboard, /rotulo="Avaliações feitas"/);
  assert.match(dashboard, /rotulo="Posts relevantes"/);
  assert.match(dashboard, /postagem\.respostas/);
  assert.match(dashboard, /Este resumo é visível apenas para você/);
  assert.match(dashboard, /role="dialog" aria-modal="true"/);
  assert.match(dashboardCss, /@media \(max-width: 820px\)/);
});

test('respostas reais alimentam o engajamento das postagens', () => {
  assert.match(comunidade, /api\.get\(`\/comunidades\/respostas\/\?postagem=\$\{postId\}`\)/);
  assert.match(comunidade, /api\.post\('\/comunidades\/respostas\/'/);
  assert.match(comunidade, /total_respostas/);
  assert.match(comunidade, /Escreva uma resposta construtiva/);
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
