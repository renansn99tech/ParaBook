import { api } from './api';

export interface Community {
  id: string | number;
  name: string;
  members: string;
  description: string;
  category: string;
  isJoined: boolean;
  maintenance?: boolean;
}

type DjangoCommunity = {
  id: string | number;
  nome?: string;
  descricao?: string;
  criada_por_sistema?: boolean;
  em_manutencao?: boolean;
  total_membros?: number;
  usuario_participa?: boolean;
};

const asArray = <T>(payload: T[] | { results?: T[] }): T[] => {
  if (Array.isArray(payload)) return payload;
  return payload.results || [];
};

const normalizeCommunity = (raw: DjangoCommunity): Community => ({
  id: raw.id,
  name: raw.nome || 'Comunidade ParaBook',
  members: `${raw.total_membros || 0} membros`,
  description: raw.descricao || 'Espaco para trocar leituras, ideias e recomendacoes.',
  category: raw.criada_por_sistema ? 'Oficial' : 'Leitores',
  isJoined: Boolean(raw.usuario_participa),
  maintenance: raw.em_manutencao,
});

export const communityService = {
  getCommunities: async (): Promise<Community[]> => {
    const response = await api.get('/comunidades/comunidades/');
    return asArray<DjangoCommunity>(response.data).map(normalizeCommunity);
  },

  getMyCommunities: async (): Promise<Community[]> => {
    const response = await api.get('/comunidades/comunidades/minhas/');
    return asArray<DjangoCommunity>(response.data).map(normalizeCommunity);
  },

  toggleMembership: async (id: string | number): Promise<void> => {
    await api.post(`/comunidades/comunidades/${id}/entrar/`);
  },
};
