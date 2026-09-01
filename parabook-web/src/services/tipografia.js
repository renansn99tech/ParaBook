export const TIPOGRAFIA_PADRAO = 'padrao';
export const CHAVE_TIPOGRAFIA = 'parabookTipografia';

export const PRESETS_TIPOGRAFICOS = {
  padrao: {
    nome: 'ParaBook Original',
    interface: 'Inter',
    editorial: 'Spectral',
    descricao: 'Equilíbrio contemporâneo com títulos de inspiração literária.',
    amostra: 'Toda história começa com uma página.',
    fonteUrl: '',
  },
  leitura_clara: {
    nome: 'Leitura Clara',
    interface: 'Atkinson Hyperlegible Next',
    editorial: 'Literata',
    descricao: 'Caracteres mais distintos e ritmo confortável para leitura prolongada.',
    amostra: 'Ler com conforto muda a jornada.',
    fonteUrl: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@300;400;500;600;700;800&family=Literata:wght@400;600;700&display=swap',
  },
  oficina_autor: {
    nome: 'Oficina do Autor',
    interface: 'IBM Plex Sans',
    editorial: 'IBM Plex Serif',
    descricao: 'Uma composição precisa e profissional para quem publica suas próprias obras.',
    amostra: 'Escrever também é escolher a voz.',
    fonteUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Serif:wght@400;600;700&display=swap',
  },
  edicao_premium: {
    nome: 'Edição Premium',
    interface: 'Source Sans 3',
    editorial: 'Source Serif 4',
    descricao: 'Acabamento editorial sofisticado com excelente definição em diferentes tamanhos.',
    amostra: 'Uma biblioteca feita sob medida.',
    fonteUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700;800&family=Source+Serif+4:wght@400;600;700&display=swap',
  },
};

export function normalizarTipografia(chave) {
  return Object.hasOwn(PRESETS_TIPOGRAFICOS, chave) ? chave : TIPOGRAFIA_PADRAO;
}

function definirLinkDeFontes(id, href) {
  if (typeof document === 'undefined' || !href) return;
  let link = document.getElementById(id);
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

export function aplicarTipografia(chave) {
  if (typeof document === 'undefined') return TIPOGRAFIA_PADRAO;
  const normalizada = normalizarTipografia(chave);
  const preset = PRESETS_TIPOGRAFICOS[normalizada];
  document.documentElement.setAttribute('data-tipografia', normalizada);
  if (preset.fonteUrl) definirLinkDeFontes('parabook-tipografia-ativa', preset.fonteUrl);
  try {
    localStorage.setItem(CHAVE_TIPOGRAFIA, normalizada);
  } catch {
    // A preferência continua valendo na sessão mesmo se o storage estiver bloqueado.
  }
  return normalizada;
}

export function carregarPreviewsTipograficas() {
  Object.entries(PRESETS_TIPOGRAFICOS).forEach(([chave, preset]) => {
    if (preset.fonteUrl) definirLinkDeFontes(`parabook-tipografia-preview-${chave}`, preset.fonteUrl);
  });
}
