import axios from 'axios';

// Instância base do Axios apontando para a API do Django
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
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

// Interceptor para lidar com Token Expirado automaticamente (Refresh) - Opcional para o futuro
// api.interceptors.response.use(...)

export default api;
