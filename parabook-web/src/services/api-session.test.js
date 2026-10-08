import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function client({ csrf = async () => ({ data: { csrfToken: 'csrf' } }), refresh = async () => ({ data: {} }) } = {}) {
  let prepare, fulfilled, reject;
  const calls = [], events = [];
  const instance = async config => { calls.push(await prepare(config)); return 'retried'; };
  instance.interceptors = { request: { use: ok => prepare = ok }, response: { use: (ok, failure) => { fulfilled = ok; reject = failure; } } };
  class CanceledError extends Error { code = 'ERR_CANCELED'; }
  const axios = { create: () => instance, get: csrf, post: refresh, isCancel: e => e.code === 'ERR_CANCELED', CanceledError };
  const source = readFileSync(new URL('./api.js', import.meta.url), 'utf8').replace("import axios from 'axios';", '').replaceAll('import.meta.env', 'environment').replaceAll('export const ', 'const ').replace('export default api;', 'globalThis.module = { api, invalidateSessionRequests, ensureCsrfToken };');
  const context = { axios, environment: { DEV: true }, Event: class { constructor(type) { this.type = type; } }, window: { dispatchEvent: e => events.push(e.type) }, setTimeout: f => setTimeout(f, 0) };
  vm.runInNewContext(source, context);
  const error = async (status, method = 'get') => ({ response: status ? { status } : undefined, config: await prepare({ url:'/biblioteca/livros/', method, headers: {} }) });
  return { ...context.module, prepare, fulfilled, reject: e => reject(e), calls, events, error };
}

test('web: CSRF concorrente é obtido uma vez e enviado nas mutações', async () => {
  let count = 0;
  const c = client({ csrf: async () => { count++; await new Promise(r=>setTimeout(r,5)); return {data:{csrfToken:'teste'}}; } });
  const requests = await Promise.all([c.prepare({method:'post',headers:{}}),c.prepare({method:'patch',headers:{}})]);
  assert.equal(count, 1); requests.forEach(r => assert.equal(r.headers['X-CSRFToken'], 'teste'));
});
test('web: GET recebe apenas uma retentativa', async () => {
  const c = client(), error = await c.error(503);
  assert.equal(await c.reject(error), 'retried'); await assert.rejects(c.reject(error)); assert.equal(c.calls.length,1);
});
test('web: falha ambígua não reenvia POST/PATCH/DELETE', async () => {
  const c = client();
  for (const method of ['post','patch','delete']) await assert.rejects(c.reject(await c.error(undefined, method)));
  assert.equal(c.calls.length,0);
});
test('web: requisição cancelada não recebe retentativa', async () => {
  const c = client(), error = await c.error(); error.code='ERR_CANCELED';
  await assert.rejects(c.reject(error)); assert.equal(c.calls.length,0);
});
test('web: logout durante GET impede reenvio e resposta tardia', async () => {
  const c = client(), error = await c.error(503), pending=c.reject(error);
  c.invalidateSessionRequests();
  await assert.rejects(pending,/Sessão alterada/); assert.equal(c.calls.length,0);
  assert.throws(()=>c.fulfilled({config:error.config}), /Sessão alterada/);
});
test('web: logout durante CSRF impede mutação', async () => {
  let finish;
  const c=client({csrf:()=>new Promise(r=>finish=r)}), pending=c.prepare({method:'post',headers:{}});
  c.invalidateSessionRequests(); finish({data:{csrfToken:'antigo'}});
  await assert.rejects(pending,/Sessão alterada/);
});
test('web: 401 concorrentes compartilham refresh', async () => {
  let count=0;
  const c=client({refresh:async()=>{count++; await new Promise(r=>setTimeout(r,5)); return {};}});
  await Promise.all([c.reject(await c.error(401)), c.reject(await c.error(401))]);
  assert.equal(count,1); assert.equal(c.calls.length,2);
});
test('web: refresh transitório preserva sessão; revogação sinaliza encerramento', async () => {
  for(const status of [503,401]) {
    const c=client({refresh:async()=>{throw {response:{status}};}});
    await assert.rejects(c.reject(await c.error(401)));
    assert.equal(c.events.includes('parabook:sessao-expirada'),status===401);
  }
});
test('web: logout durante refresh impede restauração tardia', async () => {
  let finish;
  const c=client({refresh:()=>new Promise(r=>finish=r)}), pending=c.reject(await c.error(401));
  await new Promise(r=>setTimeout(r,0)); c.invalidateSessionRequests(); finish({});
  await assert.rejects(pending,/Sessão alterada/); assert.equal(c.calls.length,0);
});
test('web: erro sem configuração preserva falha original', async () => {
  const c=client(), error={response:{status:401}};
  await assert.rejects(c.reject(error), e=>e===error);
});
