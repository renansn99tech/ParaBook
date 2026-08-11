import { useState, useEffect } from 'react';
import api from '../../services/api';

function AdminLixeira() {
  const [dados, setDados] = useState({ obras: [], denuncias: [] });
  const [loading, setLoading] = useState(true);

  const fetchDados = async () => {
    try {
      const res = await api.get('/dashboard/lixeira/');
      setDados(res.data);
    } catch (error) {
      console.error("Erro ao buscar lixeira", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const handleAction = async (acao, id) => {
    try {
      await api.post('/dashboard/lixeira/', { acao: acao, item_id: id });
      fetchDados(); // Atualiza a lista após ação
    } catch (error) {
      console.error("Erro ao processar ação na lixeira", error);
      alert("Ocorreu um erro ao processar sua solicitação.");
    }
  };

  return (
    <section className="secao">
      <h1 className="admin-titulo-icone">
        <i className="fa-solid fa-trash-can"></i> Lixeira do Sistema
      </h1>
      <p className="admin-subtitulo">
        Itens nesta área aguardam a exclusão definitiva automática (<strong>7 dias</strong> para obras, <strong>30 dias</strong> para denúncias). Você pode restaurá-los ou forçar a exclusão imediata.
      </p>

      <div className="admin-bloco">
        <h2 className="admin-bloco-titulo perigo">
          <i className="fa-solid fa-book-skull"></i> Obras Removidas
        </h2>
        <div className="admin-panel">
          {loading ? (
            <p className="admin-estado">Carregando...</p>
          ) : dados.obras.length > 0 ? (
            <ul>
              {dados.obras.map(obra => (
                <li key={obra.id}>
                  <span><strong>{obra.titulo}</strong> (Removido em: {obra.data_remocao})</span>
                  <div className="admin-linha-acoes">
                    <button className="admin-btn-mini ok" onClick={() => handleAction('restaurar_livro', obra.id)}>
                      <i className="fa-solid fa-trash-arrow-up"></i> Restaurar
                    </button>
                    <button className="admin-btn-mini nao" onClick={() => handleAction('excluir_livro_permanente', obra.id)}>
                      <i className="fa-solid fa-fire"></i> Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-estado vazio">Nenhuma obra na lixeira.</p>
          )}
        </div>
      </div>

      <div className="admin-bloco">
        <h2 className="admin-bloco-titulo aguardando">
          <i className="fa-solid fa-box-archive"></i> Denúncias Arquivadas (Falsos Positivos)
        </h2>
        <div className="admin-panel">
          {loading ? (
            <p className="admin-estado">Carregando...</p>
          ) : dados.denuncias.length > 0 ? (
            <ul>
              {dados.denuncias.map(denuncia => (
                <li key={denuncia.id}>
                  <span>Livro: <strong>{denuncia.livro}</strong> - Motivo: {denuncia.motivo} (Arquivada em: {denuncia.data_arquivamento})</span>
                  <div className="admin-linha-acoes">
                    <button className="admin-btn-mini nao" onClick={() => handleAction('excluir_denuncia_permanente', denuncia.id)}>
                      <i className="fa-solid fa-fire"></i> Excluir Definitivo
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-estado vazio">Nenhuma denúncia arquivada.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminLixeira;
