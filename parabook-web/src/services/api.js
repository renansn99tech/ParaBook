import axios from 'axios';

export const PRODUCTION_API_BASE_URL = 'https://parabook-api.onrender.com/api/v1';

// Em produção, VITE_API_URL aponta para o backend publicado. No desenvolvimento,
// forçamos o caminho relativo do proxy do Vite: assim cookies e CSRF continuam
// same-origin mesmo quando a página é aberta por localhost ou 127.0.0.1, e um
// VITE_API_URL absoluto deixado no ambiente do shell não quebra o login.
export const API_BASE_URL = import.meta.env.DEV
  ? '/api/v1'
  : (import.meta.env.VITE_API_URL?.trim() || PRODUCTION_API_BASE_URL);
let csrfToken = null;
let csrfPromise = null;
let refreshPromise = null;
let sessionGeneration = 0;

export const invalidateSessionRequests = () => {
  sessionGeneration += 1;
  csrfToken = null;
  csrfPromise = null;
  refreshPromise = null;
};

const requireCurrentSession = (config) => {
  if (config?._sessionGeneration !== undefined && config._sessionGeneration !== sessionGeneration) {
    throw new axios.CanceledError('Sessão alterada.');
  }
};

export const ensureCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    const generation = sessionGeneration;
    csrfPromise = axios.get(`${API_BASE_URL}/auth/csrf/`, {
      withCredentials: true, timeout: 30000,
    }).then((response) => {
      requireCurrentSession({ _sessionGeneration: generation });
      csrfToken = response.data.csrfToken;
      return csrfToken;
    }).finally(() => { if (generation === sessionGeneration) csrfPromise = null; });
  }
  return csrfPromise;
};

// Instância base do Axios apontando para a API do Django
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// O JWT fica exclusivamente em cookies HttpOnly. Para métodos mutáveis, o
// token CSRF retornado pelo backend vive apenas em memória.
api.interceptors.request.use(
  async (config) => {
    requireCurrentSession(config);
    config._sessionGeneration = sessionGeneration;
    const method = (config.method || 'get').toLowerCase();
    if (!['get', 'head', 'options'].includes(method)) {
      config.headers['X-CSRFToken'] = await ensureCsrfToken();
      requireCurrentSession(config);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com Token Expirado automaticamente (Refresh)
api.interceptors.response.use(
  (response) => {
    requireCurrentSession(response.config);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    requireCurrentSession(originalRequest);
    if (error.response?.data?.codigo === 'conta_restrita_etaria'
      && error.config?.url !== '/perfis/meu-perfil/') {
      window.dispatchEvent(new Event('parabook:conta-restrita-etaria'));
    }
    const transient = !error.response || [502, 503, 504].includes(error.response.status);
    if (originalRequest?.method?.toLowerCase() === 'get' && transient
        && !axios.isCancel(error) && !originalRequest.signal?.aborted && !originalRequest._readRetried) {
      originalRequest._readRetried = true;
      await new Promise((resolve) => setTimeout(resolve, 750));
      requireCurrentSession(originalRequest);
      return api(originalRequest);
    }
    
    // Se o erro for 401 (Não autorizado) e ainda não tentamos dar retry
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login/')
      || originalRequest?.url?.includes('/auth/refresh/')
      || originalRequest?.url?.includes('/auth/register/');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      
      try {
        if (!refreshPromise) {
          const generation = sessionGeneration;
          refreshPromise = ensureCsrfToken().then((token) => axios.post(
            `${API_BASE_URL}/auth/refresh/`,
            {},
            { withCredentials: true, timeout: 30000, headers: { 'X-CSRFToken': token } },
          )).finally(() => { if (generation === sessionGeneration) refreshPromise = null; });
        }
        await refreshPromise;
        requireCurrentSession(originalRequest);
        return api(originalRequest);
      } catch (refreshError) {
        requireCurrentSession(originalRequest);
        if ([400, 401].includes(refreshError.response?.status)) {
          invalidateSessionRequests();
          window.dispatchEvent(new Event('parabook:sessao-expirada'));
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
