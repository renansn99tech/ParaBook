import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import swal from '../services/swal';
import { AuthContext } from '../context/auth-context';
import useRevelacao from '../hooks/useRevelacao';

function Planos() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [contratando, setContratando] = useState(null);
  const paginaRef = useRevelacao([planos, loading]);

  useEffect(() => {
    api.get('/assinaturas/planos/')
      .then(res => setPlanos(res.data))
      .catch(err => {
        console.error("Erro ao carregar planos:", err);
        setErro('Não foi possível carregar os planos no momento. Tente novamente em instantes.');
      })
      .finally(() => setLoading(false));
  }, []);

  const contratarPlano = async (plano) => {
    if (!plano.contratacao_disponivel) {
      await swal.fire({
        icon: 'info',
        title: 'Assinaturas em breve',
        text: plano.motivo_indisponibilidade
          || 'Esta funcionalidade ainda não está disponível.',
        confirmButtonText: 'Entendi',
      });
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }
    setContratando(plano.id);
    try {
      const resposta = await api.post('/assinaturas/checkout/', { plano_id: plano.id });
      window.location.assign(resposta.data.url);
    } catch (err) {
      const mensagem = err.response?.data?.detail || 'Não foi possível iniciar a contratação.';
      await swal.fire({ icon: 'error', title: 'Assinatura indisponível', text: mensagem });
      setContratando(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: '80vh' }}>
        <h2 className="page-lead">Carregando planos...</h2>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: '80vh' }}>
        <div className="alert alert-danger d-inline-block">{erro}</div>
      </div>
    );
  }

  return (
    <div className="container py-5" ref={paginaRef} style={{ minHeight: '80vh' }}>
      {/* Cabeçalho */}
      <div className="text-center mb-5" data-revelar>
        <h1 className="fw-bold mb-2">
          Escolha o plano ideal para sua jornada
        </h1>
        <p className="page-lead fs-5 mx-auto">Desbloqueie todo o potencial da sua biblioteca e recursos exclusivos de leitura.</p>
      </div>

      <div className="row justify-content-center align-items-stretch g-4" data-revelar-cascata>
        {planos.map((plano) => {
          const preco = Number(plano.preco);
          return (
            <div key={plano.id} className="col-lg-5 col-md-6" data-revelar>
              <div className={`surface-card subscription-card position-relative ${preco > 0 ? 'subscription-card--featured' : ''}`}>

                {preco > 0 && (
                  <div className="position-absolute top-0 end-0 m-3">
                    <span className="badge rounded-pill bg-primary px-3 py-2 text-uppercase fw-semibold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                      ★ Mais Popular
                    </span>
                  </div>
                )}

                <div className="card-body p-4 p-xl-5 d-flex flex-column">
                  <h3 className="fw-bold mb-1">{plano.nome}</h3>
                  <p className="page-lead small mb-4">
                    {preco === 0
                      ? 'Ideal para leitores casuais iniciando na plataforma.'
                      : 'A experiência completa para leitores exigentes e autores.'}
                  </p>

                  <div className="mb-4 pb-3 border-bottom border-secondary border-opacity-25">
                    <span className="display-5 fw-bold">R$ {preco.toFixed(2).replace('.', ',')}</span>
                    <span className="page-lead fs-6">/ mês</span>
                  </div>

                  <ul className="list-unstyled mb-5 flex-grow-1">
                    <li className="d-flex align-items-center mb-3">
                      {plano.anuncios ? (
                        <>
                          <span className="badge bg-secondary bg-opacity-25 text-white-50 rounded-circle p-2 me-3">✕</span>
                          <span className="page-lead">Exibição de anúncios na interface</span>
                        </>
                      ) : (
                        <>
                          <span className="badge bg-success bg-opacity-25 text-success rounded-circle p-2 me-3">✓</span>
                          <strong>Navegação 100% sem anúncios</strong>
                        </>
                      )}
                    </li>

                    <li className="d-flex align-items-center mb-3">
                      <span className="badge bg-success bg-opacity-25 text-success rounded-circle p-2 me-3">✓</span>
                      {plano.limite_livros === 0 ? (
                        <strong>Biblioteca Ilimitada</strong>
                      ) : (
                        <span className="page-lead">Até <strong>{plano.limite_livros} livros</strong> na biblioteca</span>
                      )}
                    </li>

                    {preco > 0 && (
                      <>
                        <li className="d-flex align-items-center mb-3">
                          <span className="badge bg-success bg-opacity-25 text-success rounded-circle p-2 me-3">✓</span>
                          <span>Recomendações transparentes por preferências de leitura</span>
                        </li>
                        <li className="d-flex align-items-center mb-3">
                          <span className="badge bg-success bg-opacity-25 text-success rounded-circle p-2 me-3">✓</span>
                          <span>Selo de Membro <strong>Premium</strong> no Perfil</span>
                        </li>
                      </>
                    )}
                  </ul>

                  <div className="mt-auto">
                    <button
                      type="button"
                      className={`${preco > 0 ? 'btn-primary shadow-lg' : 'btn-ghost'} w-100 ${!plano.contratacao_disponivel ? 'feature-indisponivel' : ''}`}
                      onClick={() => contratarPlano(plano)}
                      disabled={contratando !== null}
                      aria-disabled={!plano.contratacao_disponivel}
                      data-feature-tooltip={!plano.contratacao_disponivel
                        ? 'Em breve: pagamentos ainda não estão disponíveis.'
                        : undefined}
                    >
                      {contratando === plano.id
                        ? 'Abrindo checkout...'
                        : (preco === 0 ? 'Começar Grátis' : `Assinar ${plano.nome}`)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Planos;
