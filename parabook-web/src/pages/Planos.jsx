import { Link } from 'react-router-dom';

function Planos() {
  // Mock data explícito
  const planos = [
    {
      id: 1,
      nome: 'Leitor',
      preco: 0.00,
      limite_livros: 20,
      anuncios: true
    },
    {
      id: 2,
      nome: 'Premium',
      preco: 19.90,
      limite_livros: 0, // 0 = ilimitado
      anuncios: false
    }
  ];

  return (
    <div className="container py-5" style={{ minHeight: '80vh' }}>
      {/* Cabeçalho */}
      <div className="text-center mb-5">
        <h1 className="fw-bold text-white mb-2">
          Escolha o plano ideal para sua jornada 
          <span className="badge bg-warning text-dark fs-6 ms-2 align-middle" title="Dados Fictícios (Mock)">Mock</span>
        </h1>
        <p className="text-white-50 fs-5">Desbloqueie todo o potencial da sua biblioteca e recursos exclusivos de leitura.</p>
      </div>

      <div className="row justify-content-center align-items-stretch g-4">
        {planos.map((plano) => (
          <div key={plano.id} className="col-lg-5 col-md-6">
            <div 
              className={`card h-100 border-0 shadow-lg position-relative rounded-4 text-white ${plano.preco > 0 ? 'bg-dark border border-primary border-2' : 'bg-dark bg-opacity-75 border border-secondary border-opacity-25'}`}
              style={{ background: '#12131C', backdropFilter: 'blur(10px)' }}
            >
              
              {plano.preco > 0 && (
                <div className="position-absolute top-0 end-0 m-3">
                  <span className="badge rounded-pill bg-primary px-3 py-2 text-uppercase fw-semibold" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    ★ Mais Popular
                  </span>
                </div>
              )}

              <div className="card-body p-4 p-xl-5 d-flex flex-column">
                <h3 className="fw-bold text-white mb-1">{plano.nome}</h3>
                <p className="text-white-50 small mb-4">
                  {plano.preco === 0 
                    ? 'Ideal para leitores casuais iniciando na plataforma.' 
                    : 'A experiência completa para leitores exigentes e autores.'}
                </p>

                <div className="mb-4 pb-3 border-bottom border-secondary border-opacity-25">
                  <span className="display-5 fw-bold text-white">R$ {plano.preco.toFixed(2).replace('.', ',')}</span>
                  <span className="text-white-50 fs-6">/ mês</span>
                </div>

                <ul className="list-unstyled mb-5 flex-grow-1">
                  <li className="d-flex align-items-center mb-3">
                    {plano.anuncios ? (
                      <>
                        <span className="badge bg-secondary bg-opacity-25 text-white-50 rounded-circle p-2 me-3">✕</span>
                        <span className="text-white-50">Exibição de anúncios na interface</span>
                      </>
                    ) : (
                      <>
                        <span className="badge bg-success bg-opacity-25 text-success rounded-circle p-2 me-3">✓</span>
                        <strong className="text-white">Navegação 100% sem anúncios</strong>
                      </>
                    )}
                  </li>

                  <li className="d-flex align-items-center mb-3">
                    <span className="badge bg-success bg-opacity-25 text-success rounded-circle p-2 me-3">✓</span>
                    {plano.limite_livros === 0 ? (
                      <strong className="text-white">Biblioteca Ilimitada</strong>
                    ) : (
                      <span className="text-white-50">Até <strong className="text-white">{plano.limite_livros} livros</strong> na biblioteca</span>
                    )}
                  </li>

                  {plano.preco > 0 && (
                    <>
                      <li className="d-flex align-items-center mb-3">
                        <span className="badge bg-success bg-opacity-25 text-success rounded-circle p-2 me-3">✓</span>
                        <span className="text-white">Recomendações Personalizadas por <strong>IA</strong></span>
                      </li>
                      <li className="d-flex align-items-center mb-3">
                        <span className="badge bg-success bg-opacity-25 text-success rounded-circle p-2 me-3">✓</span>
                        <span className="text-white">Selo de Membro <strong>Premium</strong> no Perfil</span>
                      </li>
                    </>
                  )}
                </ul>

                <div className="mt-auto">
                  <Link to="/minha-assinatura" className={`btn ${plano.preco > 0 ? 'btn-primary shadow-lg' : 'btn-outline-light'} w-100 py-3 rounded-3 fw-bold transition-all`}>
                    {plano.preco === 0 ? 'Começar Grátis' : `Assinar ${plano.nome}`}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Planos;
