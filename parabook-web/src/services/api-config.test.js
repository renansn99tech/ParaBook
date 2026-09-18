import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./api.js', import.meta.url), 'utf8');

test('produção usa a API canônica e preserva override por VITE_API_URL', () => {
  assert.match(
    source,
    /PRODUCTION_API_BASE_URL\s*=\s*['"]https:\/\/parabook-api\.onrender\.com\/api\/v1['"]/,
  );
  assert.match(source, /import\.meta\.env\.VITE_API_URL\?\.trim\(\)/);
});
