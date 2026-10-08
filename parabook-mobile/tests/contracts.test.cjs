const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(name, mocks, options = {}) {
  const file = path.join(__dirname, '../src/services', name);
  const fileName = fs.existsSync(file + '.ts') ? file + '.ts' : file + '.tsx';
  const source = fs.readFileSync(fileName, 'utf8');
  const code = ts.transpileModule(source, { fileName, compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => { if (!(id in mocks)) throw Error(id); return mocks[id]; }, process: { env: {} }, URL, ArrayBuffer, Uint8Array, __DEV__: false, setTimeout: f => setTimeout(f, 0), console, ...options });
  return exports;
}
function client(post) {
  let rejected, prepare, fulfilled;
  const calls = [];
  const instance = { interceptors: { request: { use: f => prepare = f }, response: { use: (ok, f) => { fulfilled = ok; rejected = f; } } }, request: async c => { calls.push(prepare(c)); return 'retried'; } };
  const axios = { create: () => instance, post, isAxiosError: e => e.isAxiosError, isCancel: e => e.code === 'ERR_CANCELED', CanceledError: Error };
  const saved = [];
  const module = load('api', { axios, 'expo-constants': { expoConfig: null }, './authStorage': { authStorage: { save: async t => saved.push(t) } } });
  module.setAuthTokens({ access: 'old', refresh: 'refresh' });
  const error = (status, method = 'get') => ({ isAxiosError: true, response: status ? { status } : undefined, config: prepare({ method, url: '/perfis/meu-perfil/', headers: {} }) });
  return { module, error, prepare, fulfilled, reject: e => rejected(e), calls, saved };
}

test('JWT acompanha somente o namespace e a origem canônicos', () => {
  const c = client();
  for (const url of ['https://evil.example/api/v1/livros/', '//evil.example/api/v1/', '/../../media/private.pdf', 'https://parabook-api.onrender.com/media/arquivo.pdf', 'https://usuario:senha@parabook-api.onrender.com/api/v1/livros/', '/biblioteca/livros/#fragmento']) {
    const config = { url, headers: {} };
    assert.throws(() => c.prepare(config), /Destino/);
    assert.equal(config.headers.Authorization, undefined);
  }
  assert.equal(c.prepare({ url: '/biblioteca/livros/', headers: {} }).headers.Authorization, 'Bearer old');
  assert.equal(c.prepare({ url: 'https://parabook-api.onrender.com/api/v1/biblioteca/livros/?page=2', headers: {} }).headers.Authorization, 'Bearer old');
});

test('resposta anterior ao logout não repovoa dados privados', () => {
  const c = client(), config = c.prepare({ url: '/perfis/meu-perfil/', headers: {} });
  c.module.clearAuthTokens();
  assert.throws(() => c.fulfilled({ config, data: { username: 'antigo' } }), /Sessão alterada/);
});

test('logout durante retentativa GET cancela o reenvio', async () => {
  const c = client(), pending = c.reject(c.error(503));
  c.module.clearAuthTokens();
  await assert.rejects(pending, /Sessão alterada/); assert.equal(c.calls.length, 0);
});

test('restrição de obra não sugere que trocar de login concede acesso', () => {
  const { describeApiError } = load('apiError', { axios: { isAxiosError: () => true } });
  for (const status of [403, 404]) assert.doesNotMatch(describeApiError({ response: { status } }).message, /entre novamente/i);
});

test('mensagens do leitor rejeitam valores inválidos e recalculam progresso', () => {
  const { parseReaderMessage } = load('readerState', {});
  for (const raw of ['{', 'null', JSON.stringify({type:'page', page:0,total:5}), JSON.stringify({type:'page',page:6,total:5}), JSON.stringify({type:'page',page:1.5,total:5}), JSON.stringify({type:'page',page:1,total:1000001}), ' '.repeat(2049)]) assert.equal(parseReaderMessage(raw), null);
  assert.equal(parseReaderMessage(JSON.stringify({type:'page',page:2,total:4,progress:999})).progress, 50);
  assert.doesNotMatch(parseReaderMessage(JSON.stringify({type:'error',message:'<script>segredo</script>'})).message, /segredo/);
});

test('suspensão e nova abertura invalidam respostas anteriores do leitor', () => {
  const epoch = load('readerState', {}).createRequestEpoch();
  const first = epoch.begin(); epoch.invalidate(); assert.equal(epoch.isCurrent(first), false);
  const second = epoch.begin(); assert.equal(epoch.isCurrent(first), false); assert.equal(epoch.isCurrent(second), true);
});

test('leitor recusa HTML, corpo vazio e PDF acima de 5 MiB', () => {
  const { pdfBytesForReader } = load('readerState', {});
  for (const data of [new ArrayBuffer(0), new TextEncoder().encode('<html>').buffer, new ArrayBuffer(5*1024*1024+1)]) assert.throws(()=>pdfBytesForReader(data));
  assert.equal(pdfBytesForReader(new TextEncoder().encode('%PDF-1.7\n').buffer).length, 9);
});

test('HTML do leitor oferece texto extraído sem executar marcação do PDF', async () => {
  const { buildReaderHtml } = load('readerHtml', {});
  const html = buildReaderHtml([37,80,68,70,45], 99);
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  const elements = Object.fromEntries(['status','pageCanvas','reader','pageText','textTitle','textContent'].map(id=>[id,{textContent:'',style:{},clientWidth:360,hidden:id==='pageText', getContext:()=>({setTransform(){}})}]));
  const messages=[];
  const page={getViewport:()=>({width:400,height:500}),render:()=>({promise:Promise.resolve()}),getTextContent:async()=>({items:[{str:'<script>texto literal</script>'}]})};
  const context={document:{getElementById:id=>elements[id]},window:{ReactNativeWebView:{postMessage:raw=>messages.push(JSON.parse(raw))},addEventListener(){}},pdfjsLib:{GlobalWorkerOptions:{},getDocument:config=>{assert.equal(config.isEvalSupported,false);return {promise:Promise.resolve({numPages:2,getPage:async()=>page})};}},Uint8Array};
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(messages[0].page,2); assert.equal(messages.at(-1).type,'page');
  assert.equal(elements.textContent.textContent,'<script>texto literal</script>');
  context.window.readerToggleText(); assert.equal(elements.reader.hidden,true); assert.equal(elements.pageText.hidden,false);
});

test('contraste dos textos mobile permanece legível nas superfícies', () => {
  const { colors } = load('../theme/colors', {});
  const luminance = hex => hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
  for(const foreground of ['textPrimary','textSecondary','textMuted','link','error']) for(const background of ['background','cardBackground','inputBackground']) {
    const f=luminance(colors[foreground]),b=luminance(colors[background]);
    assert.ok((Math.max(f,b)+0.05)/(Math.min(f,b)+0.05)>=4.5,`${foreground}/${background}`);
  }
  assert.ok((luminance(colors.textPrimary)+0.05)/(luminance(colors.primary)+0.05)>=4.5,'texto do botão primário');
});

test('ação desabilitada mantém nome e estado anunciado coerentes', () => {
  const { AccessibleAction } = load('../components/AccessibleAction', {
    react: require('react'), 'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { TouchableOpacity: 'NativeButton' },
  });
  const onPress=()=>{}, button=AccessibleAction({disabled:true, accessibilityLabel:'Enviar comentário', accessibilityState:{disabled:false,busy:true},onPress,children:'Enviar'});
  assert.equal(button.props.accessibilityLabel,'Enviar comentário');
  assert.equal(button.props.accessibilityState.disabled,true); assert.equal(button.props.accessibilityState.busy,true);
  assert.equal(button.props.onPress,onPress); assert.equal(button.props.children,'Enviar');
});
test('fallback de produção usa a API canônica', () => {
  const c = client();
  assert.equal(c.module.API_BASE_URL, 'https://parabook-api.onrender.com/api/v1');
});
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

test('catálogo normaliza contrato Django e preserva capa relativa', async () => {
  let params;
  const { bookService } = load('bookService', {
    './collection': { getCollection: async (_, received) => {
      params = received;
      return { data: [{ id: 7, titulo: 'Dom Casmurro', autor: 'Machado de Assis', capa_url: '/media/capas/dom.jpg', categoria_nome: 'Literatura', avaliacao: '4.50', pdf_disponivel: true }] };
    } },
    './api': { api: {}, resolveDjangoUrl: value => `https://api.example${value}` },
  });
  const books = await bookService.getBooks('machado', 3);
  assert.deepEqual(JSON.parse(JSON.stringify(params)), { search: 'machado', categoria: 3 });
  assert.deepEqual(JSON.parse(JSON.stringify(books[0])), {
    id: 7,
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    cover_url: 'https://api.example/media/capas/dom.jpg',
    category: 'Literatura',
    rating: 4.5,
    pdfAvailable: true,
  });
});

test('falha do catálogo é propagada e nunca vira lista vazia', async () => {
  const failure = new Error('backend indisponível');
  const { bookService } = load('bookService', {
    './collection': { getCollection: async () => { throw failure; } },
    './api': { api: {}, resolveDjangoUrl: value => value },
  });
  await assert.rejects(bookService.getBooks(), /backend indisponível/);
});

test('livro sem autor recebe um rótulo legível', async () => {
  const { bookService } = load('bookService', {
    './collection': { getCollection: async () => ({ data: [{ id: 8, titulo: 'Obra anônima', autor: '  ', pdf_disponivel: false }] }) },
    './api': { api: {}, resolveDjangoUrl: value => value },
  });
  assert.equal((await bookService.getBooks())[0].author, 'Autor não informado');
});

test('erros de API distinguem offline, autorização e serviço', () => {
  const { describeApiError } = load('apiError', {
    axios: { isAxiosError: error => Boolean(error?.isAxiosError) },
  });
  assert.equal(describeApiError({ isAxiosError: true }).kind, 'offline');
  assert.equal(describeApiError({ isAxiosError: true, response: { status: 401 } }).kind, 'unauthorized');
  assert.equal(describeApiError({ isAxiosError: true, response: { status: 500 } }).kind, 'error');
});
