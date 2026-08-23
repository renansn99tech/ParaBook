import axios from 'axios';
import { api, clearAuthTokens, resolveDjangoUrl, setAuthTokens } from './api';

export interface AuthTokens {
  access: string;
  refresh?: string;
}

export interface AuthenticatedUser {
  id: string | number;
  nome: string;
  tipo: string;
  cpf?: string | null;
  termos_aceitos: boolean;
  data_aceite_termos?: string | null;
  versao_termos_aceita?: string | null;
  user_auth?: {
    id: string | number;
    username: string;
    email: string;
  };
}

export interface CurrentUserProfile {
  id: string | number;
  username: string;
  email: string;
  nome: string;
  tipo: string;
  is_superuser: boolean;
  termos_aceitos: boolean;
  versao_termos_aceita?: string | null;
  historico?: string | null;
  descricao_perfil?: string | null;
  foto?: string | null;
  bio?: string | null;
  localizacao?: string | null;
  perfil_privado: boolean;
}

export interface FullUserProfile {
  is_owner: boolean;
  usuario: {
    username: string;
    nome: string;
    tipo: string;
  };
  perfil: {
    foto?: string | null;
    bio?: string | null;
    descricao_perfil?: string | null;
    localizacao?: string | null;
    historico_txt?: string | null;
  };
  estatisticas: {
    total_lidos: number;
    lendo_agora: number;
    total_avaliados: number;
    total_comunidades: number;
  };
  favoritos: {
    generos: string[];
    autores: string[];
    livros: Array<{
      id: string | number;
      titulo: string;
      autor: string;
      capa?: string | null;
    }>;
  };
  ultimo_lido: {
    titulo?: string | null;
  };
  historico: Array<{
    id: string | number;
    titulo: string;
    data: string;
  }>;
  comunidades: Array<{
    id: string | number;
    nome: string;
    descricao: string;
  }>;
}

const normalizeCurrentUserProfile = (raw: CurrentUserProfile): CurrentUserProfile => ({
  ...raw,
  foto: resolveDjangoUrl(raw.foto) || null,
});

const normalizeFullUserProfile = (raw: FullUserProfile): FullUserProfile => ({
  ...raw,
  perfil: {
    ...raw.perfil,
    foto: resolveDjangoUrl(raw.perfil?.foto) || null,
  },
  favoritos: {
    ...raw.favoritos,
    livros: raw.favoritos?.livros?.map((book) => ({
      ...book,
      capa: resolveDjangoUrl(book.capa) || null,
    })) || [],
  },
});

export const extractApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data;

  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  if (typeof data?.erro === 'string') {
    return data.erro;
  }

  if (data && typeof data === 'object') {
    const messages = Object.values(data)
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter((value): value is string => typeof value === 'string');

    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  if (typeof error.message === 'string' && error.message.toLowerCase().includes('network')) {
    return 'Nao foi possivel conectar ao servidor. Verifique sua internet e a URL da API.';
  }

  return fallback;
};

export const authService = {
  login: async (username: string, password: string): Promise<AuthTokens> => {
    const response = await api.post('/auth/mobile-login/', { username, password });
    const tokens = {
      access: response.data.access,
      refresh: response.data.refresh,
    };
    setAuthTokens(tokens);
    return tokens;
  },

  register: async (
    username: string,
    email: string,
    password: string,
    termosAceitos: boolean
  ): Promise<AuthTokens> => {
    const response = await api.post('/auth/mobile-register/', {
      username,
      email,
      password,
      termos_aceitos: termosAceitos,
    });
    const tokens = {
      access: response.data.access,
      refresh: response.data.refresh,
    };
    setAuthTokens(tokens);
    return tokens;
  },

  getAuthenticatedUser: async (): Promise<AuthenticatedUser> => {
    const response = await api.get('/auth/profile/');
    return response.data;
  },

  getCurrentUserProfile: async (): Promise<CurrentUserProfile> => {
    const response = await api.get('/perfis/meu-perfil/');
    return normalizeCurrentUserProfile(response.data);
  },

  getFullUserProfile: async (username: string): Promise<FullUserProfile> => {
    const response = await api.get(`/perfis/${username}/`);
    return normalizeFullUserProfile(response.data);
  },

  logout: () => {
    clearAuthTokens();
  },
};
