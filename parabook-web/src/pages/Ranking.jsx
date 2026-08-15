import { useState, useEffect, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import Skeleton from '../components/Skeleton';
import useRevelacao from '../hooks/useRevelacao';
// painel.css é carregado globalmente no main.jsx (compartilhado por várias telas).

// Medalhas para o pódio; da 4ª posição em diante mostramos o número.
const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function Ranking() {
  const { user, loading: carregandoUsuario } = useContext(AuthContext);

  const [ranking, setRanking] = useState([]);
  const [meuProgresso, setMeuProgresso] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const paginaRef = useRevelacao([ranking, meuProgresso, carregando]);

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
    return <div className="text-center mt-5"><h2 className="text-white">Carregando...</h2></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (carregando) {
    return (
      <main className="container py-5 painel-page">
        <div className="text-center mb-5">
          <h1 className="fw-bold text-white mb-2 painel-titulo premio">
            <i className="fa-solid fa-trophy me-2"></i>
            Ranking de Leitores
          </h1>
          <p className="fs-5 mx-auto painel-lead">
            Os membros mais ativos e apaixonados da nossa comunidade literária.
          </p>
        </div>

        <div className="painel-card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-dark table-borderless align-middle painel-tabela">
                <thead>
                  <tr className="text-white-50">
                    <th scope="col" className="text-center ps-4 col-posicao">Posição</th>
                    <th scope="col">Leitor</th>
                    <th scope="col" className="text-center">Nível</th>
                    <th scope="col" className="text-center">Sequência</th>
                    <th scope="col" className="text-end pe-4">Total XP</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="text-center ps-4"><Skeleton variant="text" width="28px" height="20px" className="mx-auto" /></td>
                      <td><Skeleton variant="text" width="140px" /></td>
                      <td className="text-center"><Skeleton variant="pill" width="70px" height="24px" className="mx-auto" /></td>
                      <td className="text-center"><Skeleton variant="text" width="40px" className="mx-auto" /></td>
                      <td className="text-end pe-4"><Skeleton variant="text" width="60px" className="ms-auto" /></td>
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
    <main className="container py-5 painel-page" ref={paginaRef}>
      <div className="text-center mb-5" data-revelar>
        <h1 className="fw-bold text-white mb-2 painel-titulo premio">
          <i className="fa-solid fa-trophy me-2"></i>
          Ranking de Leitores
        </h1>
        <p className="fs-5 mx-auto painel-lead">
          Os membros mais ativos e apaixonados da nossa comunidade literária.
        </p>
      </div>

      {erro && <div className="alert alert-danger text-center">{erro}</div>}

      {/* Cartão com a posição do usuário logado */}
      {meuProgresso && (
        <div className="painel-card destaque mb-5" data-revelar>
          <div className="card-body p-4">
            <div className="row align-items-center g-3">
              <div className="col-md-6">
                <small className="text-white-50 text-uppercase">Sua posição atual</small>
                <h3 className="fw-bold mb-0">
                  #{meuProgresso.posicao} — {meuProgresso.nome_exibicao}
                </h3>
              </div>
              <div className="col-md-6 text-md-end d-flex flex-wrap gap-2 justify-content-md-end">
                <span className="painel-chip roxo">
                  <i className="fa-solid fa-star me-1"></i>Nível {meuProgresso.nivel}
                </span>
                <span className="painel-chip verde">
                  <i className="fa-solid fa-bolt me-1"></i>{meuProgresso.pontos_xp} XP
                </span>
                <span className="painel-chip ambar">
                  <i className="fa-solid fa-fire me-1"></i>
                  {meuProgresso.dias_seguidos} {meuProgresso.dias_seguidos === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela do ranking */}
      <div className="painel-card" data-revelar>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-dark table-borderless align-middle painel-tabela">
              <thead>
                <tr className="text-white-50">
                  <th scope="col" className="text-center ps-4 col-posicao">Posição</th>
                  <th scope="col">Leitor</th>
                  <th scope="col" className="text-center">Nível</th>
                  <th scope="col" className="text-center">Sequência</th>
                  <th scope="col" className="text-end pe-4">Total XP</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length > 0 ? (
                  ranking.map((leitor) => (
                    <tr key={leitor.user_id} className={leitor.sou_eu ? 'eu' : undefined}>
                      <td className="text-center fw-bold ps-4 fs-5">
                        {MEDALHAS[leitor.posicao] || `#${leitor.posicao}`}
                      </td>
                      <td>
                        <span className="fw-semibold">{leitor.nome_exibicao}</span>
                        {leitor.sou_eu && (
                          <span className="badge bg-primary ms-2 fs-6">você</span>
                        )}
                        <small className="text-white-50 d-block">@{leitor.username}</small>
                      </td>
                      <td className="text-center">
                        <span className="painel-chip roxo">
                          Nível {leitor.nivel}
                        </span>
                      </td>
                      <td className="text-center fw-bold valor-nivel">
                        <i className="fa-solid fa-fire me-1"></i>{leitor.dias_seguidos}d
                      </td>
                      <td className="text-end pe-4 fw-bold valor-xp">
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

      <div className="text-center mt-4" data-revelar>
        <Link to="/minhas-conquistas" className="btn-ghost">
          <i className="fa-solid fa-award me-2"></i>Ver Minhas Conquistas
        </Link>
      </div>
    </main>
  );
}

export default Ranking;
