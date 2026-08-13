import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import Skeleton from '../components/Skeleton';
import CardComunidade from '../components/CardComunidade';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/comunidade.css';

const cardSkeleton = (key) => (
  <div className="card-comunidade" key={key}>
    <div className="comunidade-header w-100">
      <Skeleton variant="title" width="70%" />
    </div>
    <Skeleton variant="text" />
    <Skeleton variant="text" width="80%" />
    <Skeleton variant="pill" width="100%" height="38px" className="mt-auto" />
  </div>
);

function Comunidades() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [comunidadesOficiais, setComunidadesOficiais] = useState([]);
  const [comunidadesDaGalera, setComunidadesDaGalera] = useState([]);
  const [loading, setLoading] = useState(true);
  const paginaRef = useRevelacao([comunidadesOficiais, comunidadesDaGalera, loading]);

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
          <h1 className="pagina-comunidade-titulo mb-3">
            Comunidades
          </h1>
          <p className="pagina-comunidade-lead">
            Sinta-se livre para escolher uma comunidade para participar.
          </p>
          <div className="grid-comunidades">
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
    <CardComunidade key={comunidade.id} comunidade={comunidade} data-revelar>
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
    <main className="container py-4" ref={paginaRef}>
      <section className="pagina-comunidade">
        <div data-revelar>
          <h1 className="pagina-comunidade-titulo mb-3">
            Comunidades
          </h1>
          <p className="pagina-comunidade-lead">
            Sinta-se livre para escolher uma comunidade para participar. <br />
            Aqui você poderá fazer amigos e participar de discussões relevantes ao seu interesse.
          </p>
        </div>

        {/* Comunidades Oficiais */}
        <div className="secao-comunidades oficiais" data-revelar>
          <h3>
            <i className="fa-solid fa-bookmark"></i> Espaços Oficiais
          </h3>
          <p>
            Comunidades literárias moderadas e mantidas pelo ParaBook.
          </p>
        </div>

        <div className="grid-comunidades com-folga" data-revelar-cascata>
          {comunidadesOficiais.length > 0 ? (
            comunidadesOficiais.map(renderCard)
          ) : (
            <div className="empty-state" data-revelar>
              <p>Nenhuma comunidade oficial configurada no momento.</p>
            </div>
          )}
        </div>

        {/* Comunidades da Galera */}
        <div className="secao-comunidades da-galera separada" data-revelar>
          <h3>
            <i className="fa-solid fa-users"></i> Comunidades da Galera
          </h3>
          <p>
            Grupos independentes criados por leitores e autores da plataforma.
          </p>
        </div>

        <div className="grid-comunidades" data-revelar-cascata>
          {comunidadesDaGalera.length > 0 ? (
            comunidadesDaGalera.map(renderCard)
          ) : (
            <div className="empty-state" data-revelar>
              <i className="fa-solid fa-ghost"></i>
              <p>Nenhuma comunidade criada ou encontrada.</p>
              <p>Seja o primeiro a criar um espaço para discussão!</p>
            </div>
          )}

          {/* Botão de Criar Comunidade (Visível apenas para usuários comuns/autores, não superuser) */}
          {user && !user.is_superuser && (
            <Link to="/comunidades/criar" className="card-criar-comunidade-link" data-revelar>
              <div className="card-criar-comunidade">
                <div className="card-criar-icone mb-3">
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
