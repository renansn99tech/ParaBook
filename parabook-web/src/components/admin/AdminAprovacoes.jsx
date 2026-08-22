import { useState, useEffect } from 'react';
import api from '../../services/api';

function AdminAprovacoes() {
  const [dados, setDados] = useState({ perfis: [], publicacoes: [] });
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(null);

  const decidir = async (categoria, id, acao) => {
    if (!window.confirm(`Deseja ${acao === 'aprovar' ? 'aprovar' : 'recusar'} esta solicitação?`)) return;
    const chave = `${categoria}-${id}`;
    setProcessando(chave);
    try {
      await api.post(`/dashboard/moderacao/${categoria}/${id}/`, { acao });
      setDados((atual) => ({
        ...atual,
        perfis: categoria === 'autor' ? atual.perfis.filter((item) => item.id !== id) : atual.perfis,
        publicacoes: categoria === 'publicacao' ? atual.publicacoes.filter((item) => item.id !== id) : atual.publicacoes,
      }));
    } catch (error) {
      window.alert(error.response?.data?.detail || 'Não foi possível registrar a decisão.');
    } finally {
      setProcessando(null);
    }
  };

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const res = await api.get('/dashboard/aprovacoes/');
        setDados(res.data);
      } catch (error) {
        console.error("Erro ao buscar aprovações", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, []);

  return (
    <section className="secao">
      <h1>Central de Aprovações</h1>
      <p className="admin-subtitulo">Gerencie as submissões de novas publicações e solicitações de contas de Autores.</p>

      <div className="admin-bloco">
        <h2 className="admin-bloco-titulo">
          <i className="fa-solid fa-user-check"></i> Solicitações de Perfil (Autores)
        </h2>
        <div className="admin-panel">
          {loading ? (
            <p className="admin-estado">Carregando...</p>
          ) : dados.perfis.length > 0 ? (
            <ul>
              {dados.perfis.map(p => (
                <li key={p.id}>
                  <span>@{p.username} - {p.bio || 'Sem bio'}</span>
                  <div className="admin-linha-acoes">
                    <button type="button" className="admin-btn-mini ok" disabled={processando === `autor-${p.id}`} onClick={() => decidir('autor', p.id, 'aprovar')}>Aprovar</button>
                    <button type="button" className="admin-btn-mini nao" disabled={processando === `autor-${p.id}`} onClick={() => decidir('autor', p.id, 'recusar')}>Recusar</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-estado vazio">Nenhum usuário aguardando aprovação no momento.</p>
          )}
        </div>
      </div>

      <div className="admin-bloco">
        <h2 className="admin-bloco-titulo aguardando">
          <i className="fa-solid fa-file-circle-plus"></i> Solicitações de Publicação Pendentes
        </h2>
        <div className="admin-panel">
          {loading ? (
            <p className="admin-estado">Carregando...</p>
          ) : dados.publicacoes.length > 0 ? (
            <ul>
              {dados.publicacoes.map(pub => (
                <li key={pub.id}>
                  <span><strong>{pub.titulo_livro}</strong> (por @{pub.autor})</span>
                  <span className="admin-linha-meta">{pub.data_envio}</span>
                  <div className="admin-linha-acoes">
                    <button type="button" className="admin-btn-mini ok" disabled={processando === `publicacao-${pub.id}`} onClick={() => decidir('publicacao', pub.id, 'aprovar')}>Aprovar</button>
                    <button type="button" className="admin-btn-mini nao" disabled={processando === `publicacao-${pub.id}`} onClick={() => decidir('publicacao', pub.id, 'recusar')}>Recusar</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-estado vazio">Não há nenhuma solicitação de publicação pendente no momento.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminAprovacoes;
