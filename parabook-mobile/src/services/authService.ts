import { api, clearAuthTokens, setAuthTokens } from './api';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface UserProfile {
  id: string | number;
  nome: string;
  tipo: string;
  user_auth?: {
    id: string | number;
    username: string;
    email: string;
  };
}

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

  register: async (username: string, email: string, password: string): Promise<AuthTokens> => {
    const response = await api.post('/auth/mobile-register/', {
      username,
      email,
      password,
      termos_aceitos: true,
    });
    const tokens = {
      access: response.data.access,
      refresh: response.data.refresh,
    };
    setAuthTokens(tokens);
    return tokens;
  },

  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/auth/profile/');
    return response.data;
  },

  logout: () => {
    clearAuthTokens();
  },
};
