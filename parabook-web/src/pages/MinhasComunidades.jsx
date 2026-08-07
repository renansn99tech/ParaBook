import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../assets/css/comunidade.css';

function MinhasComunidades() {
  const [comunidades, setComunidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

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
    <main className="container py-4" style={{ minHeight: '60vh' }}>
      <section className="pagina-comunidade">
        <h1 className="pagina-comunidade-titulo mb-3" style={{ color: 'white' }}>
          Minhas Comunidades
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#d8d9e6', marginBottom: '40px' }}>
          Todos os espaços em que você participa, reunidos em um só lugar.
        </p>

        {erro && <div className="alert alert-danger">{erro}</div>}

        {!erro && comunidades.length === 0 ? (
          <div
            className="empty-state text-center"
            style={{ padding: '50px', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white' }}
          >
            <i className="fa-solid fa-users-slash" style={{ fontSize: '2.5rem', color: '#6b7280', marginBottom: '15px' }}></i>
            <h3>Você ainda não participa de nenhuma comunidade</h3>
            <p className="text-muted mb-4">
              Explore os espaços disponíveis e junte-se a discussões sobre os livros que você ama.
            </p>
            <Link to="/comunidades" className="btn btn-primary px-4 py-2 rounded-3 fw-medium">
              Explorar Comunidades
            </Link>
          </div>
        ) : (
          <div
            className="grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}
          >
            {comunidades.map((comunidade) => (
              <article className="card-comunidade" key={comunidade.id}>
                <div className="comunidade-header">
                  <h3 className="comunidade-nome text-truncate" title={comunidade.nome}>
                    {comunidade.nome}
                  </h3>
                  <div>
                    <span className="comunidade-badge badge bg-secondary text-white">
                      <i className="fa-solid fa-users me-1"></i>
                      {comunidade.total_membros || 0}/{comunidade.max_participantes}
                    </span>
                    {comunidade.criada_por_sistema && (
                      <span className="badge bg-primary ms-2" style={{ fontSize: '0.7rem', verticalAlign: 'middle' }}>
                        <i className="fa-solid fa-check-circle me-1"></i>Oficial
                      </span>
                    )}
                  </div>
                </div>

                <p className="comunidade-descricao text-muted">{comunidade.descricao}</p>

                {comunidade.em_manutencao && (
                  <div className="alert alert-warning py-2 px-3 small mb-2">
                    <i className="fa-solid fa-screwdriver-wrench me-1"></i>
                    Comunidade em manutenção temporária.
                  </div>
                )}

                <div className="comunidade-footer mt-auto d-flex gap-2">
                  <Link to={`/comunidade/${comunidade.id}/conteudo`} className="btn btn-primary flex-grow-1 fw-medium">
                    Acessar
                  </Link>
                  <button onClick={() => handleSair(comunidade.id)} className="btn btn-outline-danger fw-medium px-3">
                    Sair
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default MinhasComunidades;
