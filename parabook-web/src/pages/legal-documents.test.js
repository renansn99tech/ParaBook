import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
const documentos = readFileSync(new URL('./DocumentoLegal.jsx', import.meta.url), 'utf8');
const cadastro = readFileSync(new URL('./Register.jsx', import.meta.url), 'utf8');
const publicacao = readFileSync(new URL('./PublicarLivro.jsx', import.meta.url), 'utf8');
const rodape = readFileSync(new URL('../components/Footer.jsx', import.meta.url), 'utf8');

test('pacote jurídico possui rotas públicas distintas e versionadas', () => {
  for (const rota of ['/termos', '/privacidade', '/publicacao-e-licenca', '/direitos-autorais']) {
    assert.match(app, new RegExp(rota));
  }
  assert.match(documentos, /governanca\?\.versao_termos/);
  assert.match(documentos, /pronto_para_publicacao/);
});

test('aceites apontam para o documento aplicável', () => {
  assert.match(cadastro, /to="\/termos"/);
  assert.match(cadastro, /to="\/privacidade"/);
  assert.match(publicacao, /to="\/publicacao-e-licenca"/);
});

test('documentos mantêm os gates etário e de moderação administrativa', () => {
  assert.match(documentos, /possibilidade de aceitar usuários a partir de 14 anos/);
  assert.match(documentos, /pendente até decisão administrativa de um moderador autorizado no Dashboard/);
  assert.match(documentos, /A aprovação não representa certificação de autoria/);
});

test('rodapé expõe o pacote jurídico sem remover a jornada de autores', () => {
  assert.match(rodape, /to="\/para-autores"/);
  assert.match(rodape, /to="\/termos"/);
  assert.match(rodape, /to="\/privacidade"/);
  assert.match(rodape, /to="\/publicacao-e-licenca"/);
  assert.match(rodape, /to="\/direitos-autorais"/);
});
