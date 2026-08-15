import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (url) => readFileSync(fileURLToPath(url), 'utf8');

test('listas de conteúdo remoto reservam espaço e usam carregamento diferido', () => {
  const paginas = [
    '../../pages/Biblioteca.jsx',
    '../../pages/Home.jsx',
    '../../pages/Novidades.jsx',
    '../../pages/MinhaBiblioteca.jsx',
    '../../pages/RecomendacaoIA.jsx',
    '../../pages/Autores.jsx',
  ];

  for (const pagina of paginas) {
    const fonte = ler(new URL(pagina, import.meta.url));
    assert.match(fonte, /loading="lazy"/, `${pagina} precisa adiar imagens fora da dobra`);
    assert.match(fonte, /decoding="async"/, `${pagina} precisa decodificar sem bloquear a renderização`);
    assert.match(fonte, /width="\d+"[\s\S]*height="\d+"/, `${pagina} precisa reservar dimensões`);
  }
});

test('capa principal do livro recebe prioridade e dimensões estáveis', () => {
  const fonte = ler(new URL('../../pages/LivroInfo.jsx', import.meta.url));
  assert.match(fonte, /className="livro-capa-img"[\s\S]*fetchPriority="high"[\s\S]*width="300"[\s\S]*height="420"/);
});

test('catálogo não depende de placeholder remoto de terceiros', () => {
  const fonte = ler(new URL('../../pages/Biblioteca.jsx', import.meta.url));
  assert.doesNotMatch(fonte, /via\.placeholder\.com/);
  assert.match(fonte, /className="capa-placeholder"/);
});

test('PDF.js remoto só é carregado quando o leitor é aberto', () => {
  const index = ler(new URL('../../../index.html', import.meta.url));
  const leitor = ler(new URL('../../pages/Leitura.jsx', import.meta.url));

  assert.doesNotMatch(index, /pdf\.min\.js/);
  assert.match(leitor, /function carregarPdfJs\(\)/);
  assert.match(leitor, /script\.async = true/);
});
