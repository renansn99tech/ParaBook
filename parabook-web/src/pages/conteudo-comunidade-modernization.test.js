import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pagina = readFileSync(new URL('./ConteudoComunidade.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/conteudo-comunidade.css', import.meta.url), 'utf8');

test('carregamento preserva AuthContext, Promise.all, ordenação inicial e guarda de desativada', () => {
  assert.match(pagina, /if \(carregandoUsuario\) return/);
  assert.match(pagina, /Promise\.all\(\[api\.get\(`\/comunidades\/comunidades\/\$\{id\}\/`\), api\.get\(`\/comunidades\/postagens\/\?comunidade=\$\{id\}`\)\]\)/);
  assert.match(pagina, /pData\.sort\(\(a, b\) => new Date\(b\.criado_em\) - new Date\(a\.criado_em\)\)/);
  assert.match(pagina, /em_manutencao && !user\?\.is_superuser/);
});

test('papéis seguem as regras canônicas de admin, criador e membro', () => {
  assert.match(pagina, /const admin = Boolean\(user\?\.is_superuser\)/);
  assert.match(pagina, /!comunidade\?\.criada_por_sistema && comunidade\?\.criador === user\.usuario/);
  assert.match(pagina, /const membro = Boolean\(comunidade\?\.usuario_participa\)/);
});

test('cabeçalho oferece breadcrumb, monograma, status único, metadados e ações contextuais', () => {
  assert.match(pagina, /className="cc-breadcrumb"/);
  assert.match(pagina, /className=\{`cc-monograma/);
  assert.match(pagina, /cc-status--desativada[\s\S]*?: comunidade\.criada_por_sistema \? <span className="cc-status cc-status--oficial"/);
  assert.match(pagina, /cc-banner-acoes/);
});

test('mural possui busca com limpeza e ordenação client-side por recentes ou respostas', () => {
  assert.match(pagina, /type="search"[\s\S]*?aria-label="Limpar busca"/);
  assert.match(pagina, /<option value="recentes">Mais recentes<\/option>/);
  assert.match(pagina, /<option value="respostas">Mais respostas<\/option>/);
  assert.match(pagina, /\(b\.total_respostas \|\| 0\) - \(a\.total_respostas \|\| 0\)/);
});

test('participação usa o endpoint existente, atualização otimista e confirmação neutra ao sair', () => {
  assert.match(pagina, /api\.post\(`\/comunidades\/comunidades\/\$\{id\}\/entrar\/`\)/);
  assert.match(pagina, /usuario_participa: !participava/);
  assert.match(pagina, /confirmButtonColor: BOTAO\.neutro/);
  assert.match(pagina, /usuario_participa: participava, total_membros: totalAnterior/);
});

test('membros são buscados somente na primeira abertura pelo painel lateral', () => {
  assert.match(pagina, /if \(abrindo && membros === null\)/);
  assert.match(pagina, /api\.get\(`\/comunidades\/comunidades\/\$\{id\}\/membros\/`\)/);
  assert.match(pagina, /className="cc-side-card cc-membros-card"/);
  assert.match(pagina, /membrosVisiveis/);
});

test('rascunhos e envio de resposta são isolados por postagem', () => {
  assert.match(pagina, /const \[rascunhosResposta, setRascunhosResposta\] = useState\(\{\}\)/);
  assert.match(pagina, /rascunhosResposta\[post\.id\] \|\| ''/);
  assert.match(pagina, /setRascunhosResposta\(\(atuais\) => \(\{ \.\.\.atuais, \[postId\]: '' \}\)\)/);
  assert.match(pagina, /enviandoResposta === post\.id/);
});

test('loading usa Skeleton e estados vazio e não encontrado têm ação útil', () => {
  assert.match(pagina, /import Skeleton from '\.\.\/components\/Skeleton'/);
  assert.match(pagina, /function CarregamentoPagina/);
  assert.match(pagina, /Comunidade não encontrada/);
  assert.match(pagina, /Nenhuma conversa encontrada/);
  assert.match(pagina, /O mural está esperando a primeira conversa/);
});

test('CSS usa tokens escopados, aside de 340px, quebra em 1024px e movimento reduzido', () => {
  assert.doesNotMatch(css, /#[\da-f]{3,8}\b/i);
  assert.doesNotMatch(css, /:root/);
  assert.match(css, /\.pagina-comunidade\s*\{[\s\S]*?--cc-/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 340px/);
  assert.match(css, /@media \(max-width: 1024px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
