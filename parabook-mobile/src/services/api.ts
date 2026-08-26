import axios from 'axios';

const DEFAULT_API_BASE_URL = 'https://parabook-nl8o.onrender.com/api/v1';

// Expo SDK 54 suporta EXPO_PUBLIC_* no bundle do app. Mantemos um fallback
// para o backend real hospedado e deixamos o ambiente sobrescrever quando
// precisarmos apontar para outro servidor (ex.: IP local na mesma rede).
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (configuredApiUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
export const DJANGO_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

let accessToken: string | null = null;
let refreshToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

const isDevelopmentRuntime = () => typeof __DEV__ !== 'undefined' && __DEV__;

const getRequestEndpoint = (baseURL?: string, url?: string) => {
  if (!url) return baseURL || '(endpoint desconhecido)';
  if (/^https?:\/\//i.test(url)) return url;
  return `${(baseURL || '').replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

const describeResponseData = (data: unknown) => {
  if (Array.isArray(data)) return { type: 'array', length: data.length };
  if (data && typeof data === 'object') {
    return { type: 'object', keys: Object.keys(data as Record<string, unknown>) };
  }
  return { type: typeof data };
};

const sanitizeErrorData = (value: unknown): unknown => {
  const sensitiveKeys = new Set([
    'access', 'authorization', 'cookie', 'csrf', 'password', 'password_confirm',
    'refresh', 'secret', 'set-cookie', 'token',
  ]);

  if (Array.isArray(value)) return value.map(sanitizeErrorData);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeys.has(key.toLowerCase()) ? '[redacted]' : sanitizeErrorData(item),
    ])
  );
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  // O plano hospedado pode levar cerca de 20-30 s no primeiro acesso (cold start).
  // Ainda mantemos um teto para toda requisicao, evitando espera indefinida.
  timeout: 30000,
  headers: {
    Accept: 'application/json',
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
  (response) => {
    if (isDevelopmentRuntime()) {
      console.debug('[api] response', {
        endpoint: getRequestEndpoint(response.config.baseURL, response.config.url),
        method: response.config.method?.toUpperCase(),
        status: response.status,
        data: describeResponseData(response.data),
      });
    }

    return response;
  },
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthenticationRequest = requestUrl.includes('/auth/mobile-login/')
      || requestUrl.includes('/auth/mobile-register/');

    if (isDevelopmentRuntime()) {
      console.error('[api] request failed', {
        endpoint: getRequestEndpoint(error.config?.baseURL, error.config?.url),
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        code: error.code,
        response: sanitizeErrorData(error.response?.data),
      });
    }

    if (error.response?.status === 401 && accessToken && !isAuthenticationRequest) {
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
