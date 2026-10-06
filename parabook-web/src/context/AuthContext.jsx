import { useState, useEffect } from 'react';
import api from '../services/api';
import { aplicarTipografia, TIPOGRAFIA_PADRAO } from '../services/tipografia';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregarUsuario = async () => {
    try {
      const response = await api.get('/perfis/meu-perfil/');
      const idadeResponse = await api.get('/auth/idade/');
      const usuario = { ...response.data, restricao_etaria: idadeResponse.data };
      setUser(usuario);
      return usuario;
    } catch (error) {
      // Quando a política está ativa, /meu-perfil/ é propositalmente bloqueado
      // até que a pessoa conclua a declaração. Mantemos uma sessão mínima, sem
      // tentar inferir idade, carregar CPF ou armazenar a data no navegador.
      if (error.response?.data?.codigo === 'conta_restrita_etaria') {
        const idadeResponse = await api.get('/auth/idade/');
        const usuarioRestrito = {
          restricao_etaria: idadeResponse.data,
        };
        setUser(usuarioRestrito);
        return usuarioRestrito;
      }
      setUser(null);
      throw error;
    }
  };

  // A sessão é validada no backend; JWTs não ficam acessíveis ao JavaScript.
  useEffect(() => {
    carregarUsuario()
      .catch(() => {})
      .finally(() => setLoading(false));
    // A inicialização deve ocorrer apenas uma vez; carregarUsuario fecha sobre
    // as funções estáveis deste provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const atualizar = () => { carregarUsuario().catch(() => {}); };
    const aoFocar = () => { if (document.visibilityState === 'visible') atualizar(); };
    window.addEventListener('parabook:conta-restrita-etaria', atualizar);
    document.addEventListener('visibilitychange', aoFocar);
    return () => {
      window.removeEventListener('parabook:conta-restrita-etaria', atualizar);
      document.removeEventListener('visibilitychange', aoFocar);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    aplicarTipografia(user?.tipografia_efetiva || TIPOGRAFIA_PADRAO);
  }, [loading, user]);

  useEffect(() => {
    const estado = user?.restricao_etaria;
    if (!estado?.politica_ativa || estado.estado !== 'pendente'
      || estado.restricao_ativa || !estado.prazo_declaracao_em) return;
    const espera = Math.max(30000, new Date(estado.prazo_declaracao_em).getTime() - Date.now());
    if (!Number.isFinite(espera)) return;
    // Consulta o backend; o piso evita um ciclo de chamadas se o relógio local adiantar.
    const timer = window.setTimeout(() => { carregarUsuario().catch(() => {}); }, espera);
    return () => window.clearTimeout(timer);
  }, [user]);

  const login = async (username, password, codigo2fa = '') => {
    try {
      // Cria a sessão HttpOnly e carrega o perfil autenticado.
      const resposta = await api.post('/auth/login/', {
        username,
        password,
        ...(codigo2fa ? { codigo_2fa: codigo2fa } : {}),
      });
      if (resposta.status === 202 && resposta.data?.requires_2fa) {
        return { success: false, requires2fa: true };
      }

      await carregarUsuario();
      
      return { success: true };
    } catch (error) {
      console.error("Erro no login", error);
      const data = error.response?.data;
      const mensagem = data?.codigo_2fa?.[0] || data?.detail || 'Credenciais inválidas. Tente novamente.';
      return { success: false, error: mensagem };
    }
  };

  const register = async (userData) => {
    try {
      await api.post('/auth/register/', userData);

      // Busca os dados do perfil do usuário recém-criado
      await carregarUsuario();

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
      // `fieldErrors` preserva o dicionário do DRF por campo para o formulário
      // conseguir destacar exatamente o input que falhou (ex: username em uso).
      return { success: false, error: errorMsg, fieldErrors: data || {} };
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
      return await carregarUsuario();
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
