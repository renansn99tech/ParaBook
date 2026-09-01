import { api, resolveDjangoUrl } from './api';

export interface Community {
  id: string | number;
  name: string;
  members: string;
  description: string;
  category: string;
  isJoined: boolean;
  maintenance?: boolean;
}

export interface CommunityPost {
  id: string | number;
  communityId: string | number;
  title: string;
  content: string;
  authorName: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

type DjangoCommunity = {
  id: string | number;
  nome: string;
  descricao: string;
  criada_por_sistema?: boolean;
  em_manutencao?: boolean;
  total_membros?: number;
  usuario_participa?: boolean;
};

type DjangoCommunityPost = {
  id: string | number;
  comunidade: string | number;
  titulo: string;
  conteudo: string;
  autor_nome: string;
  imagem?: string | null;
  criado_em: string;
  atualizado_em: string;
};

const parseCollection = <T>(payload: unknown, endpoint: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'results' in payload) {
    const results = (payload as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  throw new Error(`Contrato inesperado em ${endpoint}: era esperada uma lista ou uma pagina com results.`);
};

const normalizeCommunity = (raw: DjangoCommunity): Community => ({
  id: raw.id,
  name: raw.nome,
  members: `${raw.total_membros || 0} membros`,
  description: raw.descricao,
  category: raw.criada_por_sistema ? 'Oficial' : 'Leitores',
  isJoined: Boolean(raw.usuario_participa),
  maintenance: raw.em_manutencao,
});

const normalizePost = (raw: DjangoCommunityPost): CommunityPost => ({
  id: raw.id,
  communityId: raw.comunidade,
  title: raw.titulo,
  content: raw.conteudo,
  authorName: raw.autor_nome,
  imageUrl: resolveDjangoUrl(raw.imagem),
  createdAt: raw.criado_em,
  updatedAt: raw.atualizado_em,
});

export const communityService = {
  getCommunities: async (): Promise<Community[]> => {
    const endpoint = '/comunidades/comunidades/';
    const response = await api.get(endpoint);
    return parseCollection<DjangoCommunity>(response.data, endpoint).map(normalizeCommunity);
  },

  getMyCommunities: async (): Promise<Community[]> => {
    const endpoint = '/comunidades/comunidades/minhas/';
    const response = await api.get(endpoint);
    return parseCollection<DjangoCommunity>(response.data, endpoint).map(normalizeCommunity);
  },

  getCommunityById: async (id: string | number): Promise<Community> => {
    const response = await api.get(`/comunidades/comunidades/${id}/`);
    return normalizeCommunity(response.data);
  },

  createCommunity: async (data: { name: string; description: string }): Promise<Community> => {
    const response = await api.post('/comunidades/comunidades/', {
      nome: data.name,
      descricao: data.description,
    });
    return normalizeCommunity(response.data);
  },

  toggleMembership: async (id: string | number): Promise<'joined' | 'left'> => {
    const response = await api.post(`/comunidades/comunidades/${id}/entrar/`);
    return response.data.status === 'entrou na comunidade' ? 'joined' : 'left';
  },

  getPosts: async (communityId: string | number): Promise<CommunityPost[]> => {
    const endpoint = '/comunidades/postagens/';
    const response = await api.get(endpoint, {
      params: { comunidade: communityId },
    });
    return parseCollection<DjangoCommunityPost>(response.data, endpoint).map(normalizePost);
  },

  getPostById: async (id: string | number): Promise<CommunityPost> => {
    const response = await api.get(`/comunidades/postagens/${id}/`);
    return normalizePost(response.data);
  },

  createPost: async (
    communityId: string | number,
    data: { title: string; content: string }
  ): Promise<CommunityPost> => {
    const response = await api.post('/comunidades/postagens/', {
      comunidade: communityId,
      titulo: data.title,
      conteudo: data.content,
    });
    return normalizePost(response.data);
  },
};
