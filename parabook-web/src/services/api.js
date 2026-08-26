import axios from 'axios';

// Em produção, VITE_API_URL aponta para o backend publicado. No desenvolvimento,
// forçamos o caminho relativo do proxy do Vite: assim cookies e CSRF continuam
// same-origin mesmo quando a página é aberta por localhost ou 127.0.0.1, e um
// VITE_API_URL absoluto deixado no ambiente do shell não quebra o login.
const API_BASE_URL = import.meta.env.DEV
  ? '/api/v1'
  : (import.meta.env.VITE_API_URL || '/api/v1');
let csrfToken = null;
let refreshPromise = null;

export const ensureCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  const response = await axios.get(`${API_BASE_URL}/auth/csrf/`, {
    withCredentials: true,
  });
  csrfToken = response.data.csrfToken;
  return csrfToken;
};

// Instância base do Axios apontando para a API do Django
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// O JWT fica exclusivamente em cookies HttpOnly. Para métodos mutáveis, o
// token CSRF retornado pelo backend vive apenas em memória.
api.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (!['get', 'head', 'options'].includes(method)) {
      config.headers['X-CSRFToken'] = await ensureCsrfToken();
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
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Se o erro for 401 (Não autorizado) e ainda não tentamos dar retry
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login/')
      || originalRequest?.url?.includes('/auth/refresh/')
      || originalRequest?.url?.includes('/auth/register/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      
      try {
        if (!refreshPromise) {
          refreshPromise = ensureCsrfToken().then((token) => axios.post(
            `${API_BASE_URL}/auth/refresh/`,
            {},
            { withCredentials: true, headers: { 'X-CSRFToken': token } },
          )).finally(() => { refreshPromise = null; });
        }
        await refreshPromise;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
