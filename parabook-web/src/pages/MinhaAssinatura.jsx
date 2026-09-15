import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import swal from '../services/swal';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';

function MinhaAssinatura() {
  const [assinatura, setAssinatura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [abrindoPortal, setAbrindoPortal] = useState(false);
  const paginaRef = useRevelacao([assinatura, loading]);

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
    if (!assinatura?.pagamentos_disponiveis) {
      await swal.fire({
        icon: 'info',
        title: 'Gerenciamento em breve',
        text: 'Pagamentos, cancelamentos e alterações de plano ainda não estão disponíveis.',
        confirmButtonText: 'Entendi',
      });
      return;
    }

    setAbrindoPortal(true);
    try {
      const returnUrl = `${window.location.origin}/minha-assinatura`;
      const res = await api.get('/assinaturas/portal/', { params: { return_url: returnUrl } });
      window.location.href = res.data.url;
    } catch (err) {
      console.error("Erro ao abrir portal de gerenciamento:", err);
      const mensagem = err.response?.data?.detail || 'Não foi possível abrir o portal de gerenciamento. Tente novamente.';
      swal.fire({
        icon: 'error',
        title: 'Erro',
        text: mensagem,
      });
      setAbrindoPortal(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: '80vh' }}>
        <h2 className="page-lead">Carregando sua assinatura...</h2>
      </div>
    );
  }

  return (
    <div className="container py-5" ref={paginaRef} style={{ minHeight: '80vh' }}>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h2 className="fw-bold mb-4" data-revelar>
            Minha Assinatura
          </h2>

          <div className="surface-card" data-revelar>
            <div className="card-body p-4 p-md-5">

              {erro ? (
                <div className="alert alert-danger text-center mb-0">{erro}</div>
              ) : assinatura && assinatura.ativa && assinatura.plano ? (
                <>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-4 mb-4 border-bottom border-secondary border-opacity-25">
                    <div>
                      <small className="page-lead text-uppercase fw-semibold plan-label">Plano Contratado</small>
                      <h3 className="fw-bold m-0 mt-1">{assinatura.plano.nome}</h3>
                    </div>
                    <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-3 py-2 rounded-pill fs-6">
                      ● Ativa
                    </span>
                  </div>

                  <div className="row g-4 mb-4">
                    <div className="col-sm-4">
                      <div className="subscription-metric p-3 rounded-3">
                        <small className="page-lead d-block mb-1">Valor do Plano</small>
                        <strong className="fs-5">R$ {Number(assinatura.plano.preco).toFixed(2).replace('.', ',')} <span className="fs-6 page-lead">/mês</span></strong>
                      </div>
                    </div>

                    {formatarData(assinatura.data_inicio) && (
                      <div className="col-sm-4">
                        <div className="subscription-metric p-3 rounded-3">
                          <small className="page-lead d-block mb-1">Membro desde</small>
                          <strong className="fs-5">{formatarData(assinatura.data_inicio)}</strong>
                        </div>
                      </div>
                    )}

                    {formatarData(assinatura.data_fim) && (
                      <div className="col-sm-4">
                        <div className="subscription-metric p-3 rounded-3">
                          <small className="page-lead d-block mb-1">Próxima Renovação</small>
                          <strong className="fs-5">{formatarData(assinatura.data_fim)}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <h6 className="fw-bold mb-3">Benefícios inclusos no seu plano:</h6>
                  <ul className="list-group list-group-flush mb-4 rounded-3 overflow-hidden">
                    <li className="list-group-item subscription-benefit px-3 py-3">
                      {assinatura.plano.anuncios ? (
                        <span className="text-white-50">✕ Exibe anúncios na plataforma</span>
                      ) : (
                        <span className="text-success fw-semibold">✓ Experiência total sem anúncios</span>
                      )}
                    </li>
                    <li className="list-group-item subscription-benefit px-3 py-3">
                      {assinatura.plano.limite_livros === 0 ? (
                        <span className="text-success fw-semibold">✓ Biblioteca Ilimitada</span>
                      ) : (
                        <span className="text-white-50">Limite de até {assinatura.plano.limite_livros} livros</span>
                      )}
                    </li>
                  </ul>

                  <div className="pt-2 d-flex flex-wrap gap-2">
                    <button
                      className={`btn-ghost ${!assinatura.pagamentos_disponiveis ? 'feature-indisponivel' : ''}`}
                      onClick={abrirPortal}
                      disabled={abrindoPortal}
                      aria-disabled={!assinatura.pagamentos_disponiveis}
                      data-feature-tooltip={!assinatura.pagamentos_disponiveis
                        ? 'Em breve: gerenciamento de pagamentos indisponível.'
                        : undefined}
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
                  <h4 className="fw-bold mb-2">Você ainda não possui um plano ativo</h4>
                  <p className="page-lead painel-lead estreita mx-auto mb-4">
                    Assine o <strong>ParaBook Premium</strong> para desbloquear recomendações por preferências, biblioteca ilimitada e navegação limpa sem anúncios.
                  </p>
                  <Link to="/planos" className="btn-primary">
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
