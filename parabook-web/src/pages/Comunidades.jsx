import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Skeleton from '../components/Skeleton';
import CardComunidade from '../components/CardComunidade';
import '../assets/css/comunidade.css';

const cardSkeleton = (key) => (
  <div className="card-comunidade" key={key}>
    <div className="comunidade-header" style={{ width: '100%' }}>
      <Skeleton variant="title" width="70%" />
    </div>
    <Skeleton variant="text" />
    <Skeleton variant="text" width="80%" />
    <Skeleton variant="text" width="100%" height="38px" style={{ marginTop: 'auto', borderRadius: 'var(--radius-pill)' }} />
  </div>
);

function Comunidades() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [comunidadesOficiais, setComunidadesOficiais] = useState([]);
  const [comunidadesDaGalera, setComunidadesDaGalera] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/comunidades/comunidades/')
      .then(res => {
        const data = res.data;
        setComunidadesOficiais(data.filter(c => c.criada_por_sistema));
        setComunidadesDaGalera(data.filter(c => !c.criada_por_sistema));
      })
      .catch(err => console.error("Erro ao carregar comunidades:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="container py-4">
        <section className="pagina-comunidade">
          <h1 className="pagina-comunidade-titulo mb-3" style={{ color: 'white' }}>
            Comunidades
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#d8d9e6', marginBottom: '40px' }}>
            Sinta-se livre para escolher uma comunidade para participar.
          </p>
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {[0, 1, 2].map(cardSkeleton)}
          </div>
        </section>
      </main>
    );
  }

  const handleToggleParticipacao = async (comunidadeId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/comunidades/comunidades/${comunidadeId}/entrar/`);
      
      const updateList = (list) => list.map(c => {
        if (c.id === comunidadeId) {
          const isParticipating = response.data.status === 'entrou na comunidade';
          return {
            ...c,
            usuario_participa: isParticipating,
            total_membros: isParticipating ? c.total_membros + 1 : c.total_membros - 1
          };
        }
        return c;
      });

      setComunidadesOficiais(updateList(comunidadesOficiais));
      setComunidadesDaGalera(updateList(comunidadesDaGalera));

    } catch (error) {
      console.error("Erro ao alterar participação:", error);
      // Optional: Add a SweetAlert2 notification here later
    }
  };

  // Sair é reversível (dá pra reentrar num clique), então usa o ghost
  // neutro — vermelho fica reservado para o que não tem volta.
  const renderCard = (comunidade) => (
    <CardComunidade key={comunidade.id} comunidade={comunidade}>
      {comunidade.em_manutencao && !user?.is_superuser ? (
        <button className="btn-ghost w-100" disabled>
          <i className="fa-solid fa-power-off"></i>Desativada
        </button>
      ) : comunidade.usuario_participa ? (
        <>
          <Link to={`/comunidade/${comunidade.id}/conteudo`} className="btn-primary flex-grow-1">
            Acessar
          </Link>
          <button onClick={() => handleToggleParticipacao(comunidade.id)} className="btn-ghost">
            Sair
          </button>
        </>
      ) : (
        <button onClick={() => handleToggleParticipacao(comunidade.id)} className="btn-primary w-100">
          Entrar na Comunidade
        </button>
      )}
    </CardComunidade>
  );

  return (
    <main className="container py-4">
      <section className="pagina-comunidade">
        <h1 className="pagina-comunidade-titulo mb-3" style={{ color: 'white' }}>
          Comunidades
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#d8d9e6', marginBottom: '40px' }}>
          Sinta-se livre para escolher uma comunidade para participar. <br />
          Aqui você poderá fazer amigos e participar de discussões relevantes ao seu interesse.
        </p>

        {/* Comunidades Oficiais */}
        <div style={{ textAlign: 'left', marginBottom: '30px' }}>
          <h3 style={{ color: 'white', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
            <i className="fa-solid fa-bookmark" style={{ color: '#8b5cf6' }}></i> Espaços Oficiais
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '0.95rem' }}>
            Comunidades literárias moderadas e mantidas pelo ParaBook.
          </p>
        </div>

        <div className="grid" style={{ marginBottom: '60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {comunidadesOficiais.length > 0 ? (
            comunidadesOficiais.map(renderCard)
          ) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '30px' }}>
              <p style={{ margin: 'auto' }}>Nenhuma comunidade oficial configurada no momento.</p>
            </div>
          )}
        </div>

        {/* Comunidades da Galera */}
        <div style={{ textAlign: 'left', marginBottom: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '40px' }}>
          <h3 style={{ color: 'white', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
            <i className="fa-solid fa-users" style={{ color: '#60a5fa' }}></i> Comunidades da Galera
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '0.95rem' }}>
            Grupos independentes criados por leitores e autores da plataforma.
          </p>
        </div>

        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {comunidadesDaGalera.length > 0 ? (
            comunidadesDaGalera.map(renderCard)
          ) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
              <i className="fa-solid fa-ghost" style={{ fontSize: '2.5rem', color: '#6b7280', marginBottom: '15px' }}></i>
              <p style={{ margin: 'auto', fontSize: '1.1rem' }}>Nenhuma comunidade criada ou encontrada.</p>
              <p style={{ marginTop: '5px', fontSize: '0.9rem' }}>Seja o primeiro a criar um espaço para discussão!</p>
            </div>
          )}

          {/* Botão de Criar Comunidade (Visível apenas para usuários comuns/autores, não superuser) */}
          {user && !user.is_superuser && (
            <Link to="/comunidades/criar" className="card-criar-comunidade-link" style={{ textDecoration: 'none' }}>
              <div className="card-criar-comunidade" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '12px', padding: '20px', color: 'white' }}>
                <div className="card-criar-icone mb-3" style={{ fontSize: '2rem', color: '#60a5fa' }}>
                  <i className="fas fa-plus"></i>
                </div>
                <div className="card-criar-content text-center">
                  <h4>Criar Comunidade</h4>
                  <p className="text-muted small">Crie um novo espaço para compartilhar ideias e discussões.</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

export default Comunidades;
