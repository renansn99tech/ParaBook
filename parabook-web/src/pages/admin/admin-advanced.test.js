import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
const rotaAdmin = readFileSync(new URL('../../components/admin/RotaAdmin.jsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../../components/admin/AdminAvancadoShell.jsx', import.meta.url), 'utf8');
const switchAdmin = readFileSync(new URL('../../components/admin/SwitchAdmin.jsx', import.meta.url), 'utf8');
const django = readFileSync(new URL('./AdminDjango.jsx', import.meta.url), 'utf8');
const auditoria = readFileSync(new URL('./AdminAuditoria.jsx', import.meta.url), 'utf8');
const featureFlags = readFileSync(new URL('./AdminFeatureFlags.jsx', import.meta.url), 'utf8');
const centralConta = readFileSync(new URL('../CentralConta.jsx', import.meta.url), 'utf8');
const configuracoes = readFileSync(new URL('../../components/ConfiguracoesAvancadas.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../assets/css/admin-avancado.css', import.meta.url), 'utf8');

test('dashboard e páginas avançadas usam a mesma guarda administrativa', () => {
  assert.match(app, /path="\/dashboard" element=\{<RotaAdmin><Dashboard \/><\/RotaAdmin>\}/);
  assert.match(app, /path="\/perfil\/configuracoes\/django-admin" element=\{<RotaAdmin><AdminDjango \/><\/RotaAdmin>\}/);
  assert.match(app, /path="\/perfil\/configuracoes\/auditoria" element=\{<RotaAdmin><AdminAuditoria \/><\/RotaAdmin>\}/);
  assert.match(app, /path="\/perfil\/configuracoes\/feature-flags" element=\{<RotaAdmin><AdminFeatureFlags \/><\/RotaAdmin>\}/);
  assert.match(rotaAdmin, /user\.tipo === 'admin'/);
  assert.match(rotaAdmin, /user\.is_staff \|\| user\.is_superuser/);
  assert.match(rotaAdmin, /<Navigate to="\/perfil" replace \/>/);
});

test('casco administrativo compartilha breadcrumb, selo e identificação', () => {
  assert.match(shell, /aria-label="Navegação administrativa"/);
  assert.match(shell, /to="\/perfil\?tab=configuracoes"/);
  assert.match(shell, /to="\/perfil\/configuracoes"/);
  assert.match(shell, /aa-so-admin/);
  assert.match(shell, /selo\.rotulo/);
  assert.match(shell, /<ToastAdmin/);
});

test('switch administrativo expõe estado e mantém o knob sem transição de posição', () => {
  assert.match(switchAdmin, /role="switch"/);
  assert.match(switchAdmin, /aria-checked=\{ligado\}/);
  assert.match(switchAdmin, /aria-label=\{ariaLabel\}/);
  assert.match(css, /\.aa-switch\[aria-checked='true'\] \.aa-switch-knob\s*\{[\s\S]*?translate\(var\(--aa-switch-deslocamento\), -50%\)/);
  assert.doesNotMatch(css, /\.aa-switch-knob\s*\{[^}]*transition:/);
});

test('porta do Django usa URLs do backend e registra o uso do atalho', () => {
  assert.match(django, /api\.get\('\/dashboard\/modelos-admin\/'\)/);
  assert.match(django, /api\.post\('\/dashboard\/django-admin\/acesso\/'/);
  assert.match(django, /href=\{dados\.django_admin_url\}/);
  assert.match(django, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(configuracoes, /to="\/admin\/" externo/);
  assert.match(configuracoes, /to="\/perfil\/configuracoes\/django-admin"/);
});

test('auditoria avançada é somente leitura, filtrável, paginada e exportável', () => {
  assert.match(auditoria, /formato: 'avancado'/);
  assert.match(auditoria, /proximo_cursor/);
  assert.match(auditoria, /aria-expanded=\{expandido\}/);
  assert.match(auditoria, /setSearchParams/);
  assert.match(auditoria, /formato=csv/);
  assert.doesNotMatch(auditoria, /api\.(post|patch|put|delete)/);
});

test('feature flags usa o shell avançado, o switch compartilhado e não mantém a tela legada', () => {
  assert.match(featureFlags, /<AdminAvancadoShell/);
  assert.match(featureFlags, /api\.get\('\/dashboard\/feature-flags\/'\)/);
  assert.match(featureFlags, /api\.patch\('\/dashboard\/feature-flags\/'/);
  assert.match(featureFlags, /<SwitchAdmin/);
  assert.match(featureFlags, /disabled=\{Boolean\(salvando\) \|\| indisponivel\}/);
  assert.match(featureFlags, /Trilha de auditoria/);
  assert.doesNotMatch(centralConta, /function FeatureFlags/);
});

test('2FA e Analytics do Autor ficam indisponíveis enquanto o banner é funcional', () => {
  assert.match(featureFlags, /autenticacao_2fa/);
  assert.match(featureFlags, /analytics_autor/);
  assert.match(featureFlags, /banner_anuncios/);
  assert.match(featureFlags, /Indisponível · Em breve/);
  assert.match(featureFlags, /if \(!flag\.disponivel\) return/);
  assert.match(app, /api\.get\('\/dashboard\/feature-flags\/publicas\/'\)/);
  assert.match(app, /const exibirBannerAnuncios = flagsPublicas\.banner_anuncios && !hideNavAndFooter/);
  assert.match(app, /\{exibirBannerAnuncios && \(/);
  assert.match(app, /addEventListener\('parabook:feature-flags-atualizadas'/);
  assert.match(featureFlags, /dispatchEvent\(new CustomEvent\('parabook:feature-flags-atualizadas'\)\)/);
});

test('feature flags não renderiza a navbar nem o footer globais', () => {
  assert.match(app, /const isAdminAvancado = \[[\s\S]*?'\/perfil\/configuracoes\/feature-flags'/);
  assert.match(app, /const hideNavAndFooter = isDashboard \|\| isAdminAvancado \|\| isAuthPage/);
  assert.match(app, /!hideNavAndFooter && <Navbar \/>/);
  assert.match(app, /!hideNavAndFooter && <Footer \/>/);
});

test('CSS avançado fica isolado, responsivo e não introduz hex literal', () => {
  assert.match(css, /\.admin-avancado\s*\{/);
  assert.match(css, /@media \(max-width: 992px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.aa-feature-card\.is-unavailable/);
  assert.match(css, /\.aa-feature-estado\.is-unavailable/);
  assert.match(css, /\.aa-selo\s*\{[\s\S]*?padding: 10px 14px;[\s\S]*?border-radius: var\(--radius-md\);/);
  assert.match(css, /\.aa-selo strong\s*\{[\s\S]*?white-space: nowrap;/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.aa-selo\s*\{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?width: 100%;/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(css, /:root\s*\{/);
});
