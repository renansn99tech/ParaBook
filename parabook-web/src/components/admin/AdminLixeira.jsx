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
    <section className="secao" style={{ display: 'block' }}>
      <h1 style={{ color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <i className="fa-solid fa-trash-can text-muted"></i> Lixeira do Sistema
      </h1>
      <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '30px' }}>
        Itens nesta área aguardam a exclusão definitiva automática (<strong>7 dias</strong> para obras, <strong>30 dias</strong> para denúncias). Você pode restaurá-los ou forçar a exclusão imediata.
      </p>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
          <i className="fa-solid fa-book-skull"></i> Obras Removidas
        </h2>
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {loading ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Carregando...</p>
          ) : dados.obras.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dados.obras.map(obra => (
                <li key={obra.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                  <span style={{ color: 'white' }}><strong>{obra.titulo}</strong> (Removido em: {obra.data_remocao})</span>
                  <div>
                    <button onClick={() => handleAction('restaurar_livro', obra.id)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>
                      <i className="fa-solid fa-trash-arrow-up"></i> Restaurar
                    </button>
                    <button onClick={() => handleAction('excluir_livro_permanente', obra.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>
                      <i className="fa-solid fa-fire"></i> Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic', margin: 0 }}>Nenhuma obra na lixeira.</p>
          )}
        </div>
      </div>

      <div>
        <h2 style={{ color: '#eab308', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
          <i className="fa-solid fa-box-archive"></i> Denúncias Arquivadas (Falsos Positivos)
        </h2>
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {loading ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Carregando...</p>
          ) : dados.denuncias.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dados.denuncias.map(denuncia => (
                <li key={denuncia.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                  <span style={{ color: 'white' }}>Livro: <strong>{denuncia.livro}</strong> - Motivo: {denuncia.motivo} (Arquivada em: {denuncia.data_arquivamento})</span>
                  <div>
                    <button onClick={() => handleAction('excluir_denuncia_permanente', denuncia.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>
                      <i className="fa-solid fa-fire"></i> Excluir Definitivo
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic', margin: 0 }}>Nenhuma denúncia arquivada.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminLixeira;
