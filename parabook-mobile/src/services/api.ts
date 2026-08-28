import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authStorage } from './authStorage';

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
let tokenRefreshPromise: Promise<boolean> | null = null;

type RetryableRequestConfig = InternalAxiosRequestConfig & { _parabookRetried?: boolean };

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
    'codigo_2fa', 'nova_senha', 'refresh', 'secret', 'senha', 'senha_atual',
    'set-cookie', 'token',
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

const parseTokenResponse = (data: unknown) => {
  if (!data || typeof data !== 'object' || !('access' in data) || typeof data.access !== 'string') {
    return null;
  }

  const nextRefresh = 'refresh' in data && typeof data.refresh === 'string'
    ? data.refresh
    : refreshToken;
  return nextRefresh ? { access: data.access, refresh: nextRefresh } : null;
};

const refreshMobileSession = async () => {
  if (!refreshToken) return false;

  if (!tokenRefreshPromise) {
    const currentRefresh = refreshToken;
    tokenRefreshPromise = axios.post(
      `${API_BASE_URL}/auth/mobile-refresh/`,
      { refresh: currentRefresh },
      {
        timeout: 30000,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      },
    ).then(async (response) => {
      const tokens = parseTokenResponse(response.data);
      if (!tokens) return false;
      setAuthTokens(tokens);
      await authStorage.save(tokens);
      return true;
    }).catch(() => false).finally(() => {
      tokenRefreshPromise = null;
    });
  }

  return tokenRefreshPromise;
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
  async (error: AxiosError) => {
    const requestUrl = error.config?.url || '';
    const isAuthenticationRequest = requestUrl.includes('/auth/mobile-login/')
      || requestUrl.includes('/auth/mobile-register/')
      || requestUrl.includes('/auth/mobile-refresh/')
      || requestUrl.includes('/auth/mobile-logout/');

    if (isDevelopmentRuntime()) {
      console.error('[api] request failed', {
        endpoint: getRequestEndpoint(error.config?.baseURL, error.config?.url),
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        code: error.code,
        response: sanitizeErrorData(error.response?.data),
      });
    }

    if (error.response?.status === 401 && accessToken && !isAuthenticationRequest && error.config) {
      const originalRequest = error.config as RetryableRequestConfig;
      if (!originalRequest._parabookRetried && refreshToken) {
        originalRequest._parabookRetried = true;
        const refreshed = await refreshMobileSession();
        if (refreshed) {
          return api.request(originalRequest);
        }
      }

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
