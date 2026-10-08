/** A leitura não reutiliza uma resposta anterior à suspensão/troca de sessão. */
export const createRequestEpoch = () => {
  let generation = 0;
  return {
    begin: () => ++generation,
    invalidate: () => { generation += 1; },
    isCurrent: (value: number) => generation === value,
  };
};

export type ReaderMessage = { type: 'loaded' | 'page'; page: number; total: number; progress: number }
  | { type: 'error'; message: string };

export const parseReaderMessage = (raw: string): ReaderMessage | null => {
  if (raw.length > 2048) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.type === 'error') return { type: 'error', message: 'Não foi possível renderizar o PDF. Tente novamente.' };
    if (!['page', 'loaded'].includes(value?.type) || !Number.isSafeInteger(value.page)
        || !Number.isSafeInteger(value.total) || value.total < 1 || value.total > 1000000
        || value.page < 1 || value.page > value.total) return null;
    return { type: value.type, page: value.page, total: value.total, progress: Math.round(value.page / value.total * 100) };
  } catch { return null; }
};

export const pdfBytesForReader = (data: ArrayBuffer): number[] => {
  if (!(data instanceof ArrayBuffer) || !data.byteLength || data.byteLength > 5 * 1024 * 1024) {
    throw new Error('Arquivo fora do limite de leitura.');
  }
  const bytes = new Uint8Array(data);
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('Resposta não é um PDF.');
  return Array.from(bytes);
};
