import assert from 'node:assert/strict';
import test from 'node:test';
import { obterCtaAutoria, obterCtaSecundariaLanding } from './ctaAutoria.js';

test('CTA de autoria nunca envia visitante ou leitor direto para publicação', () => {
  assert.equal(obterCtaAutoria(null).to, '/register');
  assert.equal(obterCtaAutoria({ tipo: 'leitor' }).to, '/autor/onboarding');
  assert.notEqual(obterCtaAutoria(null).to, '/publicar');
  assert.notEqual(obterCtaAutoria({ tipo: 'leitor' }).to, '/publicar');
});

test('CTA de autoria acompanha análise e libera somente papéis autorizados', () => {
  assert.equal(obterCtaAutoria({ tipo: 'aguardando_aprovacao' }).to, '/perfil');
  assert.equal(obterCtaAutoria({ tipo: 'autor' }).to, '/publicar');
  assert.equal(obterCtaAutoria({ tipo: 'admin' }).to, '/dashboard?aba=livros');
});

test('CTA secundária da landing oferece destinos úteis por estado', () => {
  assert.equal(obterCtaSecundariaLanding(null).to, '/register');
  assert.equal(obterCtaSecundariaLanding({ tipo: 'leitor' }).to, '/minha-biblioteca');
  assert.equal(obterCtaSecundariaLanding({ tipo: 'aguardando_aprovacao' }).to, '/perfil');
});
