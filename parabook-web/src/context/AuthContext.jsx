import { useState, useEffect } from 'react';
import api from '../services/api';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // A sessão é validada no backend; JWTs não ficam acessíveis ao JavaScript.
  useEffect(() => {
    api.get('/perfis/meu-perfil/')
      .then((response) => setUser(response.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    try {
      // Cria a sessão HttpOnly e carrega o perfil autenticado.
      await api.post('/auth/login/', { username, password });

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
      await api.post('/auth/register/', userData);

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

  const logout = async () => {
    try {
      await api.post('/auth/logout/');
    } catch {
      // O estado local deve ser limpo mesmo se a sessão já expirou.
    }
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
