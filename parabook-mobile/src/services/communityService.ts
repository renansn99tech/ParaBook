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
  nome?: string;
  descricao?: string;
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
    const response = await api.get('/comunidades/comunidades/');
    return asArray<DjangoCommunity>(response.data).map(normalizeCommunity);
  },

  getMyCommunities: async (): Promise<Community[]> => {
    const response = await api.get('/comunidades/comunidades/minhas/');
    return asArray<DjangoCommunity>(response.data).map(normalizeCommunity);
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
    const response = await api.get('/comunidades/postagens/', {
      params: { comunidade: communityId },
    });
    return asArray<DjangoCommunityPost>(response.data).map(normalizePost);
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
