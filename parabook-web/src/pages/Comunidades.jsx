import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../assets/css/comunidade.css';

function Comunidades() {
  const { user } = useContext(AuthContext);

  // Mocks de Comunidades
  const comunidadesOficiais = [
    { id: 1, nome: "Clube dos Clássicos", descricao: "Debate focado em livros clássicos.", membros: 154, max_participantes: 200 }
  ];
  
  const comunidadesDaGalera = [
    { id: 2, nome: "Fãs de Sci-Fi", descricao: "Ficção Científica e Fantasia espacial", membros: 34, max_participantes: 100 }
  ];

  const renderCard = (comunidade) => (
    <article className="card-comunidade" key={comunidade.id}>
      <div className="comunidade-header">
        <h3 className="comunidade-nome text-truncate" title={comunidade.nome}>
          {comunidade.nome}
        </h3>
        <span className="comunidade-badge badge bg-secondary text-white">
          <i className="fa-solid fa-users me-1"></i>
          {comunidade.membros}/{comunidade.max_participantes}
        </span>
      </div>
      <p className="comunidade-descricao text-muted">
        {comunidade.descricao}
      </p>
      <div className="comunidade-footer mt-auto">
        <button className="btn btn-primary w-100 fw-medium">
          Entrar na Comunidade
        </button>
      </div>
    </article>
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
            <Link to="#" className="card-criar-comunidade-link" style={{ textDecoration: 'none' }}>
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
