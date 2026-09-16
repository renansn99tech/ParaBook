import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const pagina = ler('./PerfilPublico.jsx');
const cssCompleto = ler('../assets/css/perfil.css');
const api = ler('../../../perfis/api/views.py');
const cssPublico = cssCompleto.slice(cssCompleto.indexOf('PERFIL PÚBLICO — COMPOSIÇÃO 2026'));

test('visitante anônimo recebe apenas o cartão básico do perfil', () => {
  assert.match(api, /class PerfilPublicoAPIView[\s\S]*?permission_classes = \[AllowAny\]/);
  assert.match(api, /"acesso": \{"autenticado": False, "nivel": "basico"\}/);
  assert.match(api, /if not request\.user\.is_authenticated:[\s\S]*?"perfil": perfil_basico/);
  assert.match(pagina, /dados\?\.acesso\?\.nivel === 'basico'/);
  assert.match(pagina, /Entre para ver a jornada literária, os favoritos e as comunidades deste perfil/);
});

test('papéis determinam as abas e solicitações pendentes são públicas como leitor', () => {
  assert.match(api, /dados_usuario\.tipo == 'aguardando_aprovacao'[\s\S]*?'leitor'/);
  assert.match(pagina, /leitor: \[[\s\S]*?favoritos[\s\S]*?comunidades/);
  assert.match(pagina, /autor: \[[\s\S]*?obras[\s\S]*?historico[\s\S]*?comunidades/);
  assert.match(pagina, /admin: \[[\s\S]*?info[\s\S]*?comunidades/);
  assert.doesNotMatch(pagina, /admin\.py|\/admin\//);
});

test('abas são linkáveis por query string e acessíveis pelo teclado', () => {
  assert.match(pagina, /useSearchParams\(\)/);
  assert.match(pagina, /searchParams\.get\('tab'\)/);
  assert.match(pagina, /role="tablist"/);
  assert.match(pagina, /role="tab"/);
  assert.match(pagina, /aria-selected=/);
  assert.match(pagina, /ArrowLeft/);
  assert.match(pagina, /ArrowRight/);
  assert.match(pagina, /evento\.key === 'Home'/);
  assert.match(pagina, /evento\.key === 'End'/);
});

test('API entrega capas, histórico enriquecido e somente obras publicadas', () => {
  assert.match(api, /livro__status='publicado'/);
  assert.match(api, /livro__data_remocao__isnull=True/);
  assert.match(api, /solicitacao_publicacao__usuario=user_auth_obj[\s\S]*?status='publicado'[\s\S]*?data_remocao__isnull=True/);
  assert.match(api, /"historico": \[[\s\S]*?"livro_id"[\s\S]*?"capa"[\s\S]*?"nota"[\s\S]*?"data"/);
  assert.match(api, /"recomendacao": recomendacao/);
  assert.match(api, /'capa': request\.build_absolute_uri\(livro_recomendado\.capa\.url\)/);
  assert.match(api, /'capa': request\.build_absolute_uri\(item_recomendado\.livro\.capa\.url\)/);
});

test('privacidade diferencia campo oculto de campo não informado', () => {
  assert.match(api, /"exibir_idade": perfil_do_usuario\.exibir_idade/);
  assert.match(api, /"exibir_data_nascimento": perfil_do_usuario\.exibir_data_nascimento/);
  assert.match(api, /"exibir_email": perfil_do_usuario\.exibir_email/);
  assert.match(pagina, /exibir === false \? 'Privado' : \(valor \|\| vazio\)/);
  assert.match(pagina, /pessoais\.exibir_data_nascimento === false \? 'Privado'/);
});

test('comunidades usam a rota vigente e a interface mantém as decisões editoriais', () => {
  assert.match(pagina, /to=\{`\/comunidade\/\$\{comunidade\.id\}\/conteudo`\}/);
  assert.match(pagina, /Recomendação do autor/);
  assert.match(pagina, /Recomendação do leitor/);
  assert.match(pagina, /futuro repasse/);
  assert.match(pagina, /navigator\.clipboard\.writeText\(url\)/);
});

test('composição pública usa tokens, tipografia editorial e movimento reduzido', () => {
  assert.ok(cssPublico.length > 1000);
  assert.match(cssPublico, /font-family: var\(--fonte-editorial\)/);
  assert.match(cssPublico, /@media \(max-width: 720px\)/);
  assert.match(cssPublico, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(cssPublico, /#[0-9a-fA-F]{3,8}/);
});

test('perfil público compartilha a largura externa do perfil pessoal', () => {
  assert.match(cssCompleto, /\.perfil-page\s*{[\s\S]*?max-width: var\(--layout-max\)[\s\S]*?margin: 0 9%[\s\S]*?padding: 30px 45px/);
  assert.match(cssPublico, /@media \(min-width: 1400px\)[\s\S]*?\.perfil-publico-page\s*{[\s\S]*?width: min\(var\(--layout-max\), calc\(100% - 48px\)\)[\s\S]*?margin-inline: auto/);
  assert.doesNotMatch(cssPublico, /@media \(max-width: 992px\)[\s\S]{0,120}\.perfil-publico-page\s*{[\s\S]*?width: 100%/);
});

test('avatar e cards públicos sobem à mesma coordenada visual do perfil pessoal', () => {
  assert.match(cssPublico, /\.perfil-publico-page \.perfil-content-wrapper\s*{[\s\S]*?margin: -130px auto 0/);
  assert.match(cssPublico, /mantêm o selo atrás do conjunto/);
});
