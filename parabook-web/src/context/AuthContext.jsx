import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Executa assim que a aplicação abre para checar se já há um token salvo
  useEffect(() => {
    const storedTokens = localStorage.getItem('parabookTokens');
    if (storedTokens) {
      // Se existe token, tentamos buscar o perfil do usuário
      api.get('/perfis/meu-perfil/')
        .then((response) => {
          setUser(response.data);
        })
        .catch((error) => {
          console.error("Token inválido ou expirado", error);
          logout(); // Limpa o estado se deu erro
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      // 1. Obtém os tokens (Access e Refresh) da rota de login
      const response = await api.post('/auth/login/', { username, password });
      const tokens = response.data;
      
      // 2. Salva no navegador
      localStorage.setItem('parabookTokens', JSON.stringify(tokens));
      
      // 3. Puxa os dados do usuário para preencher a tela
      // Como o interceptor já pega o token do localStorage, a próxima requisição já vai autenticada
      const userResponse = await api.get('/perfis/meu-perfil/');
      setUser(userResponse.data);
      
      return true;
    } catch (error) {
      console.error("Erro no login", error);
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register/', userData);
      const tokens = response.data;

      // A API já retorna os tokens JWT no registro
      localStorage.setItem('parabookTokens', JSON.stringify(tokens));

      // Busca os dados do perfil do usuário recém-criado
      const userResponse = await api.get('/perfis/meu-perfil/');
      setUser(userResponse.data);

      return { success: true };
    } catch (error) {
      console.error("Erro no cadastro", error);
      const data = error.response?.data;
      let errorMsg = 'Erro ao realizar o cadastro.';

      if (data) {
        // Coleta mensagens de validação do DRF (ex: { username: ["..."], password: ["..."] })
        const messages = Object.values(data).flat();
        if (messages.length > 0) {
          errorMsg = messages.join(' ');
        }
      }
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('parabookTokens');
    setUser(null);
  };

  // Rebusca o perfil quando algo muda no back-end fora do fluxo de login
  // (ex: aceite de termos, solicitacao para virar autor).
  const recarregarUsuario = async () => {
    try {
      const response = await api.get('/perfis/meu-perfil/');
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Erro ao recarregar o usuário", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, recarregarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
};
