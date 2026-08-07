import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

function MinhaAssinatura() {
  const [assinatura, setAssinatura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [abrindoPortal, setAbrindoPortal] = useState(false);

  useEffect(() => {
    api.get('/assinaturas/minha-assinatura/')
      .then(res => setAssinatura(res.data))
      .catch(err => {
        if (err.response && err.response.status === 404) {
          // Resposta esperada da API para quem ainda não tem plano ativo
          setAssinatura(null);
        } else {
          console.error("Erro ao carregar assinatura:", err);
          setErro('Não foi possível carregar sua assinatura no momento. Tente novamente em instantes.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const formatarData = (isoString) => {
    if (!isoString) return null;
    return new Date(isoString).toLocaleDateString('pt-BR');
  };

  const abrirPortal = async () => {
    setAbrindoPortal(true);
    try {
      const returnUrl = `${window.location.origin}/minha-assinatura`;
      const res = await api.get('/assinaturas/portal/', { params: { return_url: returnUrl } });
      window.location.href = res.data.url;
    } catch (err) {
      console.error("Erro ao abrir portal de gerenciamento:", err);
      const mensagem = err.response?.data?.detail || 'Não foi possível abrir o portal de gerenciamento. Tente novamente.';
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: mensagem,
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#8b5cf6'
      });
      setAbrindoPortal(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: '80vh' }}>
        <h2 className="text-white-50">Carregando sua assinatura...</h2>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ minHeight: '80vh' }}>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h2 className="fw-bold text-white mb-4">
            Minha Assinatura
          </h2>

          <div className="card border-0 shadow-lg rounded-4 text-white" style={{ background: '#12131C', backdropFilter: 'blur(10px)' }}>
            <div className="card-body p-4 p-md-5">

              {erro ? (
                <div className="alert alert-danger text-center mb-0">{erro}</div>
              ) : assinatura && assinatura.ativa && assinatura.plano ? (
                <>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-4 mb-4 border-bottom border-secondary border-opacity-25">
                    <div>
                      <small className="text-white-50 text-uppercase fw-semibold" style={{ letterSpacing: '1px' }}>Plano Contratado</small>
                      <h3 className="fw-bold text-white m-0 mt-1">{assinatura.plano.nome}</h3>
                    </div>
                    <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-3 py-2 rounded-pill fs-6">
                      ● Ativa
                    </span>
                  </div>

                  <div className="row g-4 mb-4">
                    <div className="col-sm-4">
                      <div className="p-3 rounded-3 bg-dark bg-opacity-50 border border-secondary border-opacity-10">
                        <small className="text-white-50 d-block mb-1">Valor do Plano</small>
                        <strong className="fs-5 text-white">R$ {Number(assinatura.plano.preco).toFixed(2).replace('.', ',')} <span className="fs-6 text-white-50">/mês</span></strong>
                      </div>
                    </div>

                    {formatarData(assinatura.data_inicio) && (
                      <div className="col-sm-4">
                        <div className="p-3 rounded-3 bg-dark bg-opacity-50 border border-secondary border-opacity-10">
                          <small className="text-white-50 d-block mb-1">Membro desde</small>
                          <strong className="fs-5 text-white">{formatarData(assinatura.data_inicio)}</strong>
                        </div>
                      </div>
                    )}

                    {formatarData(assinatura.data_fim) && (
                      <div className="col-sm-4">
                        <div className="p-3 rounded-3 bg-dark bg-opacity-50 border border-secondary border-opacity-10">
                          <small className="text-white-50 d-block mb-1">Próxima Renovação</small>
                          <strong className="fs-5 text-white">{formatarData(assinatura.data_fim)}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <h6 className="fw-bold text-white mb-3">Benefícios inclusos no seu plano:</h6>
                  <ul className="list-group list-group-flush mb-4 rounded-3 overflow-hidden">
                    <li className="list-group-item bg-dark bg-opacity-25 text-white border-secondary border-opacity-10 px-3 py-3">
                      {assinatura.plano.anuncios ? (
                        <span className="text-white-50">✕ Exibe anúncios na plataforma</span>
                      ) : (
                        <span className="text-success fw-semibold">✓ Experiência total sem anúncios</span>
                      )}
                    </li>
                    <li className="list-group-item bg-dark bg-opacity-25 text-white border-secondary border-opacity-10 px-3 py-3">
                      {assinatura.plano.limite_livros === 0 ? (
                        <span className="text-success fw-semibold">✓ Biblioteca Ilimitada</span>
                      ) : (
                        <span className="text-white-50">Limite de até {assinatura.plano.limite_livros} livros</span>
                      )}
                    </li>
                  </ul>

                  <div className="pt-2 d-flex flex-wrap gap-2">
                    <button
                      className="btn btn-outline-light px-4 py-2 rounded-3"
                      onClick={abrirPortal}
                      disabled={abrindoPortal}
                    >
                      {abrindoPortal ? 'Abrindo portal...' : '⚙️ Gerenciar ou Cancelar Assinatura'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="mb-3">
                    <span className="badge bg-primary bg-opacity-25 text-primary rounded-circle p-3 fs-3">📖</span>
                  </div>
                  <h4 className="fw-bold text-white mb-2">Você ainda não possui um plano ativo</h4>
                  <p className="text-white-50 mx-auto mb-4" style={{ maxWidth: '480px' }}>
                    Assine o <strong>ParaBook Premium</strong> para desbloquear recursos avançados como recomendação por inteligência artificial, biblioteca ilimitada e navegação limpa sem anúncios.
                  </p>
                  <Link to="/planos" className="btn btn-primary btn-lg px-5 py-3 rounded-3 fw-bold shadow-lg">
                    Conhecer os Planos
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MinhaAssinatura;
