import axios from 'axios';

// ATENÇÃO: Se estiver testando no celular físico via Expo Go,
// substitua '192.168.X.X' pelo IP da sua máquina na rede local (ex: 192.168.1.15:8000).
// Em rede local no Windows, certifique-se de que o Django está rodando em `python manage.py runserver 0.0.0.0:8000`.
const API_BASE_URL = 'http://192.168.1.171:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});