import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CardComunidade from '../components/CardComunidade';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/comunidade.css';

function MinhasComunidades() {
  const [comunidades, setComunidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const paginaRef = useRevelacao([comunidades, loading]);

  useEffect(() => {
    api.get('/comunidades/comunidades/minhas/')
      .then(res => setComunidades(res.data))
      .catch(err => {
        console.error("Erro ao carregar suas comunidades:", err);
        setErro('Não foi possível carregar suas comunidades no momento.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSair = async (comunidadeId) => {
    try {
      await api.post(`/comunidades/comunidades/${comunidadeId}/entrar/`);
      setComunidades(prev => prev.filter(c => c.id !== comunidadeId));
    } catch (error) {
      console.error("Erro ao sair da comunidade:", error);
    }
  };

  if (loading) {
    return (
      <main className="container py-5 text-center" style={{ minHeight: '60vh' }}>
        <h2 className="text-white-50">Carregando suas comunidades...</h2>
      </main>
    );
  }

  return (
    <main className="container py-4" ref={paginaRef} style={{ minHeight: '60vh' }}>
      <section className="pagina-comunidade">
        <div data-revelar>
          <h1 className="pagina-comunidade-titulo mb-3">
            Minhas Comunidades
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
            Todos os espaços em que você participa, reunidos em um só lugar.
          </p>
        </div>

        {erro && <div className="alert alert-danger">{erro}</div>}

        {!erro && comunidades.length === 0 ? (
          <div
            data-revelar
            className="empty-state text-center"
            style={{ padding: '50px', border: '2px dashed var(--border-strong)', borderRadius: '12px', color: 'var(--text)' }}
          >
            <i className="fa-solid fa-users-slash" style={{ fontSize: '2.5rem', color: '#6b7280', marginBottom: '15px' }}></i>
            <h3>Você ainda não participa de nenhuma comunidade</h3>
            <p className="text-muted mb-4">
              Explore os espaços disponíveis e junte-se a discussões sobre os livros que você ama.
            </p>
            <Link to="/comunidades" className="btn-primary">
              Explorar Comunidades
            </Link>
          </div>
        ) : (
          <div
            className="grid"
            data-revelar-cascata
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}
          >
            {comunidades.map((comunidade) => (
              <CardComunidade key={comunidade.id} comunidade={comunidade} data-revelar>
                <Link to={`/comunidade/${comunidade.id}/conteudo`} className="btn-primary flex-grow-1">
                  Acessar
                </Link>
                <button onClick={() => handleSair(comunidade.id)} className="btn-ghost">
                  Sair
                </button>
              </CardComunidade>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default MinhasComunidades;
