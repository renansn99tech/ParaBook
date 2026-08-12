import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/painel.css';

function RecomendacaoIA() {
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [motivoGeral, setMotivoGeral] = useState('');
  const [loading, setLoading] = useState(true);
  const [requerPremium, setRequerPremium] = useState(false);
  const [erro, setErro] = useState('');
  const paginaRef = useRevelacao([recomendacoes, loading, requerPremium]);

  useEffect(() => {
    api.get('/biblioteca/recomendacoes-ia/')
      .then(res => {
        setRecomendacoes(res.data.recomendacoes);
        setMotivoGeral(res.data.motivo_geral);
      })
      .catch(err => {
        if (err.response?.status === 403 && err.response?.data?.requer_premium) {
          setRequerPremium(true);
        } else {
          console.error("Erro ao carregar recomendações:", err);
          setErro('Não foi possível carregar suas recomendações no momento.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container py-5 text-center painel-page alta">
        <h2 className="text-white-50">Analisando sua estante...</h2>
      </div>
    );
  }

  if (requerPremium) {
    return (
      <div className="container py-5 painel-page alta" ref={paginaRef}>
        <div className="row justify-content-center">
          <div className="col-lg-7">
            <div className="painel-card text-center" data-revelar>
              <div className="card-body p-4 p-md-5">
                <span className="badge bg-warning bg-opacity-25 text-warning rounded-circle p-3 fs-3 mb-3">✨</span>
                <h3 className="fw-bold text-white mb-3">Recurso exclusivo Premium</h3>
                <p className="painel-lead estreita mx-auto mb-4">
                  As recomendações personalizadas analisam seu histórico de leituras para sugerir
                  obras alinhadas ao seu gosto. Assine o ParaBook Premium para desbloquear.
                </p>
                <Link to="/planos" className="btn btn-primary btn-lg px-5 py-3 rounded-3 fw-bold shadow-lg">
                  Conhecer os Planos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5 painel-page alta" ref={paginaRef}>
      <div className="text-center mb-5" data-revelar>
        <h1 className="fw-bold text-white mb-2">
          <i className="fa-solid fa-wand-magic-sparkles me-2"></i>
          Recomendações para Você
        </h1>
        <p className="fs-5 mx-auto painel-lead larga">{motivoGeral}</p>
      </div>

      {erro && <div className="alert alert-danger text-center">{erro}</div>}

      {!erro && recomendacoes.length === 0 ? (
        <div className="text-center py-5" data-revelar>
          <i className="fa-solid fa-book-open text-white-50 fs-1 mb-3 d-block"></i>
          <h4 className="text-white">Ainda não temos sugestões novas para você</h4>
          <p className="text-white-50 mb-4">
            Parece que você já adicionou à sua estante tudo o que temos publicado por aqui!
          </p>
          <Link to="/biblioteca" className="btn-ghost">
            Explorar a Biblioteca
          </Link>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4" data-revelar-cascata>
          {recomendacoes.map((livro) => (
            <div className="col" key={livro.id} data-revelar>
              <div
                className="painel-card h-100 position-relative"
              >
                <div className="position-absolute top-0 end-0 m-2">
                  <span
                    className="badge rounded-pill px-3 py-2 fw-semibold"
                    title="Índice de afinidade com o seu perfil de leitura"
                  >
                    {livro.afinidade}% match
                  </span>
                </div>

                {livro.capa_url ? (
                  <img
                    src={livro.capa_url}
                    className="card-img-top rounded-top-4 capa-recomendacao"
                    alt={`Capa do livro ${livro.titulo}`}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="d-flex flex-column align-items-center justify-content-center rounded-top-4"
                  >
                    <i className="fa-solid fa-book fa-3x text-white-50 mb-2"></i>
                    <small className="text-white-50 text-uppercase">Sem Capa</small>
                  </div>
                )}

                <div className="card-body d-flex flex-column p-3">
                  <h5 className="fw-bold text-white mb-1">{livro.titulo}</h5>
                  <p className="text-white-50 small mb-2">{livro.autor}</p>

                  <p className="small mb-3 flex-grow-1 motivo-ia">
                    <i className="fa-solid fa-sparkles me-1"></i>{livro.motivo_card}
                  </p>

                  <Link to={`/livro/${livro.id}`} className="btn btn-primary w-100 rounded-3 fw-medium mt-auto">
                    Ver detalhes
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecomendacaoIA;
