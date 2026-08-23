import axios from 'axios';

const DEFAULT_API_BASE_URL = 'https://parabook-nl8o.onrender.com/api/v1';

// Expo SDK 54 suporta EXPO_PUBLIC_* no bundle do app. Mantemos um fallback
// para o backend real hospedado e deixamos o ambiente sobrescrever quando
// precisarmos apontar para outro servidor (ex.: IP local na mesma rede).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
export const DJANGO_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

let accessToken: string | null = null;
let refreshToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  // O plano hospedado pode levar cerca de 20-30 s no primeiro acesso (cold start).
  // Ainda mantemos um teto para toda requisicao, evitando espera indefinida.
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && accessToken) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);

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

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

export const resolveDjangoUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${DJANGO_BASE_URL}${normalizedPath}`;
};
