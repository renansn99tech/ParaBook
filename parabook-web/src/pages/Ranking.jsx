import { useState, useEffect, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Skeleton from '../components/Skeleton';

// Medalhas para o pódio; da 4ª posição em diante mostramos o número.
const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function Ranking() {
  const { user, loading: carregandoUsuario } = useContext(AuthContext);

  const [ranking, setRanking] = useState([]);
  const [meuProgresso, setMeuProgresso] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!user) return;

    api.get('/gamificacao/ranking/')
      .then(res => {
        setRanking(res.data.ranking);
        setMeuProgresso(res.data.meu_progresso);
      })
      .catch(err => {
        console.error("Erro ao carregar o ranking:", err);
        setErro('Não foi possível carregar o ranking no momento.');
      })
      .finally(() => setCarregando(false));
  }, [user]);

  if (carregandoUsuario) {
    return <div className="text-center mt-5"><h2 style={{ color: 'white' }}>Carregando...</h2></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (carregando) {
    return (
      <main className="container py-5" style={{ minHeight: '70vh' }}>
        <div className="text-center mb-5">
          <h1 className="fw-bold text-white mb-2">
            <i className="fa-solid fa-trophy me-2" style={{ color: '#f59e0b' }}></i>
            Ranking de Leitores
          </h1>
          <p className="text-white-50 fs-5 mx-auto" style={{ maxWidth: '620px' }}>
            Os membros mais ativos e apaixonados da nossa comunidade literária.
          </p>
        </div>

        <div className="card border-0 shadow-lg rounded-4 text-white" style={{ background: '#12131C' }}>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-dark table-borderless align-middle mb-0" style={{ background: 'transparent' }}>
                <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <tr className="text-white-50">
                    <th scope="col" className="text-center ps-4" style={{ width: '90px' }}>Posição</th>
                    <th scope="col">Leitor</th>
                    <th scope="col" className="text-center">Nível</th>
                    <th scope="col" className="text-center">Sequência</th>
                    <th scope="col" className="text-end pe-4">Total XP</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="text-center ps-4"><Skeleton variant="text" width="28px" height="20px" style={{ margin: '0 auto' }} /></td>
                      <td><Skeleton variant="text" width="140px" /></td>
                      <td className="text-center"><Skeleton variant="text" width="70px" height="24px" style={{ margin: '0 auto', borderRadius: 'var(--radius-pill)' }} /></td>
                      <td className="text-center"><Skeleton variant="text" width="40px" style={{ margin: '0 auto' }} /></td>
                      <td className="text-end pe-4"><Skeleton variant="text" width="60px" style={{ marginLeft: 'auto' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-5" style={{ minHeight: '70vh' }}>
      <div className="text-center mb-5">
        <h1 className="fw-bold text-white mb-2">
          <i className="fa-solid fa-trophy me-2" style={{ color: '#f59e0b' }}></i>
          Ranking de Leitores
        </h1>
        <p className="text-white-50 fs-5 mx-auto" style={{ maxWidth: '620px' }}>
          Os membros mais ativos e apaixonados da nossa comunidade literária.
        </p>
      </div>

      {erro && <div className="alert alert-danger text-center">{erro}</div>}

      {/* Cartão com a posição do usuário logado */}
      {meuProgresso && (
        <div
          className="card border-0 shadow-lg rounded-4 text-white mb-5"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #12131C 100%)' }}
        >
          <div className="card-body p-4">
            <div className="row align-items-center g-3">
              <div className="col-md-6">
                <small className="text-white-50 text-uppercase">Sua posição atual</small>
                <h3 className="fw-bold mb-0">
                  #{meuProgresso.posicao} — {meuProgresso.nome_exibicao}
                </h3>
              </div>
              <div className="col-md-6 text-md-end d-flex flex-wrap gap-2 justify-content-md-end">
                <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(139,92,246,0.25)', color: '#c4b5fd' }}>
                  <i className="fa-solid fa-star me-1"></i>Nível {meuProgresso.nivel}
                </span>
                <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac' }}>
                  <i className="fa-solid fa-bolt me-1"></i>{meuProgresso.pontos_xp} XP
                </span>
                <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                  <i className="fa-solid fa-fire me-1"></i>
                  {meuProgresso.dias_seguidos} {meuProgresso.dias_seguidos === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela do ranking */}
      <div className="card border-0 shadow-lg rounded-4 text-white" style={{ background: '#12131C' }}>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-dark table-borderless align-middle mb-0" style={{ background: 'transparent' }}>
              <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <tr className="text-white-50">
                  <th scope="col" className="text-center ps-4" style={{ width: '90px' }}>Posição</th>
                  <th scope="col">Leitor</th>
                  <th scope="col" className="text-center">Nível</th>
                  <th scope="col" className="text-center">Sequência</th>
                  <th scope="col" className="text-end pe-4">Total XP</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length > 0 ? (
                  ranking.map((leitor) => (
                    <tr
                      key={leitor.user_id}
                      style={{
                        background: leitor.sou_eu ? 'rgba(139,92,246,0.15)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <td className="text-center fw-bold ps-4 fs-5">
                        {MEDALHAS[leitor.posicao] || `#${leitor.posicao}`}
                      </td>
                      <td>
                        <span className="fw-semibold">{leitor.nome_exibicao}</span>
                        {leitor.sou_eu && (
                          <span className="badge bg-primary ms-2" style={{ fontSize: '0.7rem' }}>você</span>
                        )}
                        <small className="text-white-50 d-block">@{leitor.username}</small>
                      </td>
                      <td className="text-center">
                        <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
                          Nível {leitor.nivel}
                        </span>
                      </td>
                      <td className="text-center fw-bold" style={{ color: '#fcd34d' }}>
                        <i className="fa-solid fa-fire me-1"></i>{leitor.dias_seguidos}d
                      </td>
                      <td className="text-end pe-4 fw-bold" style={{ color: '#86efac' }}>
                        {leitor.pontos_xp} XP
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-white-50">
                      Nenhum leitor pontuou ainda. Seja o primeiro!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <Link to="/minhas-conquistas" className="btn-ghost">
          <i className="fa-solid fa-award me-2"></i>Ver Minhas Conquistas
        </Link>
      </div>
    </main>
  );
}

export default Ranking;
