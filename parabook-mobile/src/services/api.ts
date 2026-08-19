import axios from 'axios';

// ATENÇÃO: Se estiver testando no celular físico via Expo Go,
// substitua '192.168.X.X' pelo IP da sua máquina na rede local (ex: 192.168.1.15:8000).
// Em rede local no Windows, certifique-se de que o Django está rodando em `python manage.py runserver 0.0.0.0:8000`.
export const API_BASE_URL = 'http://192.168.1.171:8000/api/v1';
export const DJANGO_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export const setAuthTokens = (tokens: { access: string; refresh?: string }) => {
  accessToken = tokens.access;
  refreshToken = tokens.refresh || null;
};

export const clearAuthTokens = () => {
  accessToken = null;
  refreshToken = null;
};

export const getAccessToken = () => accessToken;

export const getRefreshToken = () => refreshToken;

export const resolveDjangoUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${DJANGO_BASE_URL}${normalizedPath}`;
};
