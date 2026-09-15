import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const planosPath = new URL('./Planos.jsx', import.meta.url);
const assinaturaPath = new URL('./MinhaAssinatura.jsx', import.meta.url);
const cssPath = new URL('../assets/css/polish.css', import.meta.url);

test('planos pagos exibem aviso imediato e dica de indisponibilidade', async () => {
  const source = await readFile(planosPath, 'utf8');

  assert.match(source, /if \(!plano\.contratacao_disponivel\)/);
  assert.match(source, /swal\.fire\(\{/);
  assert.match(source, /data-feature-tooltip=/);
  assert.match(source, /aria-disabled=/);
});

test('portal de pagamentos bloqueado também usa aviso imediato', async () => {
  const source = await readFile(assinaturaPath, 'utf8');

  assert.match(source, /if \(!assinatura\?\.pagamentos_disponiveis\)/);
  assert.match(source, /Gerenciamento em breve/);
  assert.match(source, /feature-indisponivel/);
});

test('dica da funcionalidade aparece por hover e foco de teclado', async () => {
  const source = await readFile(cssPath, 'utf8');

  assert.match(source, /\.feature-indisponivel:hover::after/);
  assert.match(source, /\.feature-indisponivel:focus-visible::after/);
  assert.match(source, /content:\s*attr\(data-feature-tooltip\)/);
});
