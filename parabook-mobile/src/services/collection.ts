import type { AxiosResponse } from 'axios';
import { api, API_BASE_URL } from './api';

// Os consumidores atuais esperam uma lista completa, nunca só a primeira página.
export const getCollection = async (endpoint: string, params?: Record<string, unknown>) => {
  const items: unknown[] = [];
  let next: string | null = endpoint;
  const visited = new Set<string>();
  while (next) {
    const url = new URL(next.startsWith('/') && !next.startsWith('/api/') ? `${API_BASE_URL}${next}` : next, `${API_BASE_URL}/`);
    const base = new URL(`${API_BASE_URL}/`);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || visited.has(url.href) || visited.size >= 100) {
      throw new Error('Paginação inválida. Atualize a lista.');
    }
    visited.add(url.href);
    const response: AxiosResponse = await api.get(next, { params: visited.size === 1 ? params : undefined });
    const data: { results?: unknown[]; next?: string } | unknown[] = response.data;
    if (Array.isArray(data)) return { data: [...items, ...data] };
    if (!Array.isArray(data?.results)) throw new Error('Resposta de lista inválida.');
    items.push(...data.results);
    next = data.next || null;
  }
  return { data: items };
};
