import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';

export default function useHomeData() {
  const { user } = useContext(AuthContext);
  const [estado, setEstado] = useState({
    novidades: [],
    comunidadesOficiais: [],
    resumoLeitura: null,
    carregandoResumo: false,
    erroResumo: '',
    inicioPersonalizado: null,
    carregandoInicio: false,
    erroInicio: '',
    loading: true,
    erro: '',
  });

  useEffect(() => {
    const controller = new AbortController();
    setEstado((atual) => ({
      ...atual,
      loading: true,
      carregandoResumo: Boolean(user),
      carregandoInicio: Boolean(user),
      erro: '',
      erroResumo: '',
      erroInicio: '',
    }));

    async function carregar() {
      try {
        const resumoPromise = user
          ? api.get('/perfis/resumo-leitura/', { signal: controller.signal })
            .catch((error) => {
              if (error.code === 'ERR_CANCELED') throw error;
              console.error('Erro ao buscar resumo de leitura:', error);
              return { data: null, indisponivel: true };
            })
          : Promise.resolve({ data: null, indisponivel: false });
        const inicioPromise = user
          ? api.get('/perfis/inicio/', { signal: controller.signal })
            .catch((error) => {
              if (error.code === 'ERR_CANCELED') throw error;
              console.error('Erro ao buscar início personalizado:', error);
              return { data: null, indisponivel: true };
            })
          : Promise.resolve({ data: null, indisponivel: false });
        const [livrosRes, comunidadesRes, resumoRes, inicioRes] = await Promise.all([
          api.get('/biblioteca/livros/', { signal: controller.signal }),
          api.get('/comunidades/comunidades/', { signal: controller.signal }),
          resumoPromise,
          inicioPromise,
        ]);

        const livros = livrosRes.data.results || livrosRes.data;
        const comunidades = comunidadesRes.data.results || comunidadesRes.data;

        setEstado({
          novidades: livros.slice(0, 3),
          comunidadesOficiais: comunidades.filter((item) => item.criada_por_sistema).slice(0, 3),
          resumoLeitura: resumoRes.data,
          carregandoResumo: false,
          erroResumo: resumoRes.indisponivel ? 'Não foi possível carregar seu resumo agora.' : '',
          inicioPersonalizado: inicioRes.data,
          carregandoInicio: false,
          erroInicio: inicioRes.indisponivel ? 'Não foi possível organizar suas próximas ações agora.' : '',
          loading: false,
          erro: '',
        });
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        console.error('Erro ao buscar dados da Home:', error);
        setEstado((atual) => ({
          ...atual,
          loading: false,
          carregandoResumo: false,
          carregandoInicio: false,
          erro: 'Não foi possível atualizar as novidades agora.',
        }));
      }
    }

    carregar();
    return () => controller.abort();
  }, [user]);

  return { user, ...estado };
}
