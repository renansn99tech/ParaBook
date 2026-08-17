import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';

export default function useHomeData() {
  const { user } = useContext(AuthContext);
  const [estado, setEstado] = useState({
    novidades: [],
    comunidadesOficiais: [],
    loading: true,
    erro: '',
  });

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      try {
        const [livrosRes, comunidadesRes] = await Promise.all([
          api.get('/biblioteca/livros/', { signal: controller.signal }),
          api.get('/comunidades/comunidades/', { signal: controller.signal }),
        ]);

        const livros = livrosRes.data.results || livrosRes.data;
        const comunidades = comunidadesRes.data.results || comunidadesRes.data;

        setEstado({
          novidades: livros.slice(0, 3),
          comunidadesOficiais: comunidades.filter((item) => item.criada_por_sistema).slice(0, 3),
          loading: false,
          erro: '',
        });
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        console.error('Erro ao buscar dados da Home:', error);
        setEstado((atual) => ({
          ...atual,
          loading: false,
          erro: 'Não foi possível atualizar as novidades agora.',
        }));
      }
    }

    carregar();
    return () => controller.abort();
  }, []);

  return { user, ...estado };
}
