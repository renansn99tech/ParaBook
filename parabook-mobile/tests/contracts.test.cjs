const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(name, mocks) {
  const source = fs.readFileSync(path.join(__dirname, '../src/services', name + '.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => { if (!(id in mocks)) throw Error(id); return mocks[id]; }, process: { env: {} }, URL, __DEV__: false, setTimeout: f => setTimeout(f, 0), console });
  return exports;
}
function client(post) {
  let rejected, prepare;
  const calls = [];
  const instance = { interceptors: { request: { use: f => prepare = f }, response: { use: (_, f) => rejected = f } }, request: async c => { calls.push(prepare(c)); return 'retried'; } };
  const axios = { create: () => instance, post, isAxiosError: e => e.isAxiosError, isCancel: e => e.code === 'ERR_CANCELED', CanceledError: Error };
  const saved = [];
  const module = load('api', { axios, './authStorage': { authStorage: { save: async t => saved.push(t) } } });
  module.setAuthTokens({ access: 'old', refresh: 'refresh' });
  const error = (status, method = 'get') => ({ isAxiosError: true, response: status ? { status } : undefined, config: prepare({ method, url: '/perfis/meu-perfil/', headers: {} }) });
  return { module, error, reject: e => rejected(e), calls, saved };
}
test('GET temporário recebe somente uma retentativa', async () => {
  const c = client(); const e = c.error(503);
  assert.equal(await c.reject(e), 'retried');
  await assert.rejects(c.reject(e)); assert.equal(c.calls.length, 1);
});
test('POST ambíguo não é reenviado', async () => {
  const c = client(); await assert.rejects(c.reject(c.error(undefined, 'post'))); assert.equal(c.calls.length, 0);
});
test('401 concorrentes compartilham refresh', async () => {
  let count = 0;
  const c = client(async () => { count++; await new Promise(r => setTimeout(r, 5)); return { data: { access: 'new', refresh: 'rotated' } }; });
  await Promise.all([c.reject(c.error(401)), c.reject(c.error(401))]);
  assert.equal(count, 1); assert.equal(c.saved.length, 1); assert.equal(c.module.getAccessToken(), 'new');
});
test('falha transitória no refresh preserva sessão', async () => {
  const c = client(async () => { throw { isAxiosError: true, response: { status: 503 } }; });
  let loggedOut = false; c.module.setUnauthorizedHandler(() => loggedOut = true);
  await assert.rejects(c.reject(c.error(401))); assert.equal(loggedOut, false); assert.equal(c.module.getAccessToken(), 'old');
});
test('refresh revogado encerra sessão', async () => {
  const c = client(async () => { throw { isAxiosError: true, response: { status: 401 } }; });
  let loggedOut = false; c.module.setUnauthorizedHandler(() => loggedOut = true);
  await assert.rejects(c.reject(c.error(401))); assert.equal(loggedOut, true);
});
test('logout durante refresh impede restauração tardia', async () => {
  let finish;
  const c = client(() => new Promise(r => finish = r));
  const result = c.reject(c.error(401)); c.module.clearAuthTokens();
  finish({ data: { access: 'late', refresh: 'late' } });
  await assert.rejects(result); assert.equal(c.module.getAccessToken(), null); assert.equal(c.saved.length, 0);
});
test('paginação lê páginas seguintes com segurança', async () => {
  let count = 0;
  const { getCollection } = load('collection', { './api': { API_BASE_URL: 'https://test.example/api/v1', api: { get: async () => ({ data: ++count === 1 ? { results: [1], next: 'https://test.example/api/v1/biblioteca/livros/?page=2' } : { results: [2], next: null } }) } } });
  assert.deepEqual(Array.from((await getCollection('/biblioteca/livros/')).data), [1,2]);
});
test('paginação externa nunca recebe autenticação', async () => {
  let count = 0;
  const { getCollection } = load('collection', { './api': { API_BASE_URL: 'https://test.example/api/v1', api: { get: async () => { count++; return { data: { results: [], next: 'https://evil.example/' } }; } } } });
  await assert.rejects(getCollection('/biblioteca/livros/')); assert.equal(count, 1);
});

test('SecureStore serializa save e clear durante logout', async () => {
  let stored = null;
  const secure = { setItemAsync: async (_, value) => { await new Promise(r => setTimeout(r, 5)); stored = value; }, getItemAsync: async () => stored, deleteItemAsync: async () => { stored = null; } };
  const { authStorage } = load('authStorage', { 'react-native': { Platform: { OS: 'ios' } }, 'expo-secure-store': secure });
  await Promise.all([authStorage.save({ access: 'test', refresh: 'test' }), authStorage.clear()]);
  assert.equal(await authStorage.read(), null);
});
