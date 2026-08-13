import { useState, useEffect, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import Skeleton from '../components/Skeleton';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/painel.css';

/**
 * O catálogo tem ícones do Font Awesome (seed) e o default do model é do
 * Bootstrap Icons (`bi-award`). O React usa Font Awesome, então normalizamos.
 */
function classeDoIcone(icone) {
  if (!icone) return 'fa-solid fa-award';
  if (icone.startsWith('bi')) return 'fa-solid fa-award';
  return icone.startsWith('fa-solid') || icone.startsWith('fa-') ? icone : `fa-solid ${icone}`;
}

function MinhasConquistas() {
  const { user, loading: carregandoUsuario } = useContext(AuthContext);

  const [conquistas, setConquistas] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const paginaRef = useRevelacao([conquistas, resumo, carregando]);

  useEffect(() => {
    if (!user) return;

    api.get('/gamificacao/minhas-conquistas/')
      .then(res => {
        setConquistas(res.data.conquistas);
        setResumo({
          total: res.data.total,
          desbloqueadas: res.data.total_desbloqueadas,
          xpConquistado: res.data.xp_conquistado,
          progresso: res.data.meu_progresso
        });
      })
      .catch(err => {
        console.error("Erro ao carregar suas conquistas:", err);
        setErro('Não foi possível carregar suas conquistas no momento.');
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
        <div className="text-center mb-4">
          <h1 className="fw-bold text-white mb-2 painel-titulo">
            <i className="fa-solid fa-award me-2"></i>
            Galeria de Conquistas
          </h1>
          <p className="fs-5 mx-auto painel-lead">
            Complete desafios no ParaBook para desbloquear badges e ganhar experiência.
          </p>
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="col" key={i}>
              <div className="conquista-card">
                <div className="card-body p-4 d-flex align-items-start gap-3">
                  <Skeleton variant="avatar" width="58px" height="58px" />
                  <div className="flex-grow-1">
                    <Skeleton variant="pill" width="90px" height="20px" className="mb-2" />
                    <Skeleton variant="title" width="80%" />
                    <Skeleton variant="text" width="100%" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const percentual = resumo && resumo.total > 0
    ? Math.round((resumo.desbloqueadas / resumo.total) * 100)
    : 0;

  return (
    <main className="container py-5 painel-page" ref={paginaRef}>
      <div className="text-center mb-4" data-revelar>
        <h1 className="fw-bold text-white mb-2 painel-titulo">
          <i className="fa-solid fa-award me-2"></i>
          Galeria de Conquistas
        </h1>
        <p className="fs-5 mx-auto painel-lead">
          Complete desafios no ParaBook para desbloquear badges e ganhar experiência.
        </p>
      </div>

      {erro && <div className="alert alert-danger text-center">{erro}</div>}

      {/* Barra de progresso geral */}
      {resumo && (
        <div className="painel-card mb-5" data-revelar>
          <div className="card-body p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h5 className="fw-bold mb-0">
                {resumo.desbloqueadas} de {resumo.total} conquistas desbloqueadas
              </h5>
              <div className="d-flex flex-wrap gap-2">
                <span className="painel-chip roxo">
                  <i className="fa-solid fa-star me-1"></i>Nível {resumo.progresso.nivel}
                </span>
                <span className="painel-chip verde">
                  <i className="fa-solid fa-bolt me-1"></i>{resumo.progresso.pontos_xp} XP totais
                </span>
                <span className="painel-chip ambar">
                  <i className="fa-solid fa-medal me-1"></i>{resumo.xpConquistado} XP em badges
                </span>
              </div>
            </div>

            <div className="progress painel-progresso" role="progressbar"
                 aria-label="Progresso das conquistas" aria-valuenow={percentual} aria-valuemin="0" aria-valuemax="100">
              <div
                className="progress-bar"
                style={{ width: `${percentual}%` }}
              ></div>
            </div>
            <small className="text-white-50 d-block mt-2">{percentual}% da galeria completa.</small>
          </div>
        </div>
      )}

      {conquistas.length === 0 && !erro ? (
        <div className="text-center py-5" data-revelar>
          <i className="fa-solid fa-box-open text-white-50 fs-1 mb-3 d-block"></i>
          <h4 className="text-white">Nenhuma conquista cadastrada no momento</h4>
          <p className="text-white-50 mb-4">Novos desafios chegarão em breve à plataforma.</p>
          <Link to="/biblioteca" className="btn-ghost">
            Explorar a Biblioteca
          </Link>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4" data-revelar-cascata>
          {conquistas.map((conquista) => (
            <div className="col" key={conquista.id} data-revelar>
              {/* O estado (desbloqueada/bloqueada) entra como classe; quem
                  decide a cor, a opacidade e o contorno é o painel.css. */}
              <div className={`conquista-card ${conquista.desbloqueada ? 'desbloqueada' : 'bloqueada'}`}>
                <div className="card-body p-4 d-flex align-items-start gap-3">
                  <div className="conquista-icone">
                    <i className={conquista.desbloqueada ? classeDoIcone(conquista.icone) : 'fa-solid fa-lock'}></i>
                  </div>

                  <div className="flex-grow-1">
                    <span className="badge conquista-selo mb-2">
                      {conquista.desbloqueada ? 'Desbloqueada' : 'Bloqueada'}
                    </span>

                    <h5 className="fw-bold mb-1">{conquista.nome}</h5>
                    <p className="text-white-50 small mb-2">{conquista.descricao}</p>

                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <small className="fw-bold conquista-xp">
                        +{conquista.pontos_recompensa} XP
                      </small>
                      <small className="text-white-50">• {conquista.categoria_display}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center mt-5" data-revelar>
        <Link to="/ranking" className="btn-ghost">
          <i className="fa-solid fa-trophy me-2"></i>Ver o Ranking de Leitores
        </Link>
      </div>
    </main>
  );
}

export default MinhasConquistas;
