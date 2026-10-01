import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
const documentos = readFileSync(new URL('./DocumentoLegal.jsx', import.meta.url), 'utf8');
const diretrizes = readFileSync(new URL('./Diretrizes.jsx', import.meta.url), 'utf8');
const cadastro = readFileSync(new URL('./Register.jsx', import.meta.url), 'utf8');
const publicacao = readFileSync(new URL('./PublicarLivro.jsx', import.meta.url), 'utf8');
const rodape = readFileSync(new URL('../components/Footer.jsx', import.meta.url), 'utf8');
const manifesto = JSON.parse(readFileSync(
  new URL('../../../legal/approvals/2026-09-30.json', import.meta.url),
  'utf8',
));

function sha256(conteudo) {
  return createHash('sha256').update(conteudo).digest('hex');
}

test('pacote jurídico possui rotas públicas distintas e versionadas', () => {
  for (const rota of ['/termos', '/privacidade', '/publicacao-e-licenca', '/direitos-autorais']) {
    assert.match(app, new RegExp(rota));
  }
  assert.match(documentos, /governanca\?\.versao_termos/);
  assert.match(documentos, /pronto_para_publicacao/);
  assert.match(documentos, /2026-09-30/);
  assert.match(diretrizes, /2026-09-30/);
});

test('manifesto de aprovação corresponde aos textos jurídicos revisados', () => {
  assert.equal(manifesto.version, '2026-09-30');
  assert.equal(manifesto.status, 'approved_by_controller_pending_publication');
  assert.equal(manifesto.approval.approver, 'Renan S. Nascimento');
  assert.equal(manifesto.approval.external_legal_opinion, false);
  assert.equal(manifesto.artifacts.DocumentoLegal.sha256, sha256(documentos));
  assert.equal(manifesto.artifacts.Diretrizes.sha256, sha256(diretrizes));
  assert.deepEqual(
    manifesto.documents.map(({ id }) => id),
    ['terms', 'privacy', 'publication-license', 'copyright-reports', 'community-guidelines'],
  );
});

test('aceites apontam para o documento aplicável', () => {
  assert.match(cadastro, /to="\/termos"/);
  assert.match(cadastro, /to="\/privacidade"/);
  assert.match(publicacao, /to="\/publicacao-e-licenca"/);
});

test('documentos mantêm os gates etário e de moderação administrativa', () => {
  assert.match(documentos, /pessoas com 18 anos ou mais/);
  assert.match(documentos, /Modo Restrito/);
  assert.match(documentos, /Toda submissão permanece pendente até decisão administrativa de moderador autorizado no Dashboard/);
  assert.match(documentos, /aprovação administrativa não certifica a autoria declarada/);
});

test('política de privacidade identifica mapa, fornecedores e recursos desligados', () => {
  assert.match(documentos, /Mapa resumido de tratamento/);
  for (const fornecedor of ['Render', 'Supabase', 'Vercel', 'Google \\(Gmail gratuito\\)']) {
    assert.match(documentos, new RegExp(fornecedor));
  }
  assert.match(documentos, /Pagamentos, SMTP, analytics externo e publicidade permanecem desligados/);
  assert.match(documentos, /Aceitar os Termos de Uso não significa consentir genericamente/);
  assert.match(documentos, /Gmail gratuito/);
  assert.match(documentos, /não é apresentada pelo ParaBook como serviço de operador contratado/);
});

test('licença e moderação preservam limites e prazos aprovados', () => {
  assert.match(documentos, /licença mundial, não exclusiva, gratuita e revogável/);
  assert.match(documentos, /não lhes concede autoria, propriedade, poder de venda/);
  assert.match(documentos, /até 6 horas/);
  assert.match(documentos, /até 15 dias úteis para P2/);
  assert.match(documentos, /PB-LGPD-AAAA-NNN/);
  assert.match(documentos, /declaração completa será fornecida em até 15 dias/);
  assert.match(documentos, /registro neutro de “obra indisponível”/);
  assert.match(documentos, /Resenhas e avaliações produzidas por outros usuários poderão permanecer/);
});

test('diretrizes são documento comunitário próprio e preservam recurso', () => {
  assert.match(diretrizes, /Diretrizes da Comunidade/);
  assert.match(diretrizes, /Uma denúncia não determina culpa nem remoção automática/);
  assert.match(diretrizes, /contranotificação ou recurso/);
  assert.match(diretrizes, /sem promessa de plantão 24 horas/);
  assert.match(diretrizes, /sem aumento automático de sanção/);
  assert.match(diretrizes, /permanecem confidenciais perante a pessoa denunciada por padrão/);
  assert.match(documentos, /Qualquer pessoa poderá enviar alerta anônimo/);
  assert.match(documentos, /necessidade estritamente demonstrada para o exercício de defesa/);
});

test('rodapé expõe o pacote jurídico sem remover a jornada de autores', () => {
  assert.match(rodape, /to="\/para-autores"/);
  assert.match(rodape, /to="\/termos"/);
  assert.match(rodape, /to="\/privacidade"/);
  assert.match(rodape, /to="\/publicacao-e-licenca"/);
  assert.match(rodape, /to="\/direitos-autorais"/);
});
