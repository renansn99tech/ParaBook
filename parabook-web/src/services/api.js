import axios from 'axios';

// Em produção, defina VITE_API_URL nas variáveis de ambiente do serviço
// (ex: Render Static Site). Sem isso, cai no backend local de desenvolvimento.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

// Instância base do Axios apontando para a API do Django
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injetar o Token JWT em TODAS as requisições que precisarem
api.interceptors.request.use(
  (config) => {
    // Busca o token no armazenamento do navegador
    const tokens = JSON.parse(localStorage.getItem('parabookTokens'));
    if (tokens && tokens.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
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
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const tokensString = localStorage.getItem('parabookTokens');
        if (tokensString) {
          const tokens = JSON.parse(tokensString);
          
          if (tokens.refresh) {
            // Tenta obter um novo access token usando o refresh token
            const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
              refresh: tokens.refresh
            });
            
            // Atualiza os tokens no localStorage
            const newTokens = {
              ...tokens,
              access: response.data.access
            };
            localStorage.setItem('parabookTokens', JSON.stringify(newTokens));
            
            // Atualiza o header da requisição original e a refaz
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Se falhar o refresh (ex: refresh token expirado também), desloga o usuário
        localStorage.removeItem('parabookTokens');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
