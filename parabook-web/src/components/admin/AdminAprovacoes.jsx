import { useState, useEffect } from 'react';
import api from '../../services/api';

function AdminAprovacoes() {
  const [dados, setDados] = useState({ perfis: [], publicacoes: [] });
  const [loading, setLoading] = useState(true);

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
    <section className="secao" style={{ display: 'block' }}>
      <h1 style={{ color: 'white', marginBottom: '10px' }}>Central de Aprovações</h1>
      <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '30px' }}>Gerencie as submissões de novas publicações e solicitações de contas de Autores.</p>
      
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#c084fc', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
          <i className="fa-solid fa-user-check"></i> Solicitações de Perfil (Autores)
        </h2>
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {loading ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Carregando...</p>
          ) : dados.perfis.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dados.perfis.map(p => (
                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'white' }}>@{p.username} - {p.bio || 'Sem bio'}</span>
                  <div>
                    <button style={{ background: '#22c55e', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Aprovar</button>
                    <button style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Recusar</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic', margin: 0 }}>Nenhum usuário aguardando aprovação no momento.</p>
          )}
        </div>
      </div>

      <div>
        <h2 style={{ color: '#fbbf24', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
          <i className="fa-solid fa-file-circle-plus"></i> Solicitações de Publicação Pendentes
        </h2>
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {loading ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Carregando...</p>
          ) : dados.publicacoes.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dados.publicacoes.map(pub => (
                <li key={pub.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'white' }}><strong>{pub.titulo_livro}</strong> (por @{pub.autor})</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{pub.data_envio}</span>
                  <div>
                    <button style={{ background: '#22c55e', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', marginRight: '10px', cursor: 'pointer' }}>Avaliar</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic', margin: 0 }}>Não há nenhuma solicitação de publicação pendente no momento.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminAprovacoes;
