import { useState, useEffect } from 'react';
import api from '../../services/api';

function AdminDenuncias({ setAbaAtiva }) {
  const [dados, setDados] = useState({ livros: [], comunidades: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const res = await api.get('/dashboard/denuncias/');
        setDados(res.data);
      } catch (error) {
        console.error("Erro ao buscar denúncias", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, []);

  return (
    <section className="secao" style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: 'white', marginBottom: '5px' }}>Denúncias Recebidas</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Moderação ativa de conteúdo violador de direitos autorais ou termos de uso.</p>
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
          <i className="fa-solid fa-book-open"></i> Denúncias de Livros
        </h2>
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {loading ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Carregando...</p>
          ) : dados.livros.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dados.livros.map(d => (
                <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'white' }}>Livro: <strong>{d.livro}</strong> - Motivo: {d.motivo}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Por: @{d.denunciante} em {d.data}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic', margin: 0 }}>Nenhuma denúncia de livro pendente.</p>
          )}
        </div>
      </div>

      <div>
        <h2 style={{ color: '#eab308', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
          <i className="fa-solid fa-users-slash"></i> Denúncias de Comunidades
        </h2>
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {loading ? (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Carregando...</p>
          ) : dados.comunidades.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dados.comunidades.map(c => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'white' }}>Comunidade: <strong>{c.comunidade}</strong> - Motivo: {c.motivo}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Por: @{c.denunciante} em {c.data}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic', margin: 0 }}>Nenhuma denúncia de comunidade no momento.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminDenuncias;
