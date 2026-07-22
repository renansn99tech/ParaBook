import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../assets/css/perfil.css';

function PerfilPublico() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('info');

  useEffect(() => {
    // Se for o próprio usuário, já redireciona de cara (fallback extra)
    if (user && user.username === username) {
      navigate('/perfil');
      return;
    }

    const fetchPerfil = async () => {
      try {
        const res = await api.get(`/perfis/${username}/`);
        
        // Regra do backend: is_owner verdadeiro -> redireciona
        if (res.data.is_owner) {
          navigate('/perfil');
          return;
        }

        setDados(res.data);
      } catch (err) {
        if (err.response && err.response.status === 403) {
          setErro(err.response.data.erro || "Acesso negado.");
        } else {
          setErro("Perfil não encontrado ou erro no servidor.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, [username, user, navigate]);

  if (loading) {
    return <div className="text-center mt-5"><h3 className="text-white">Carregando perfil...</h3></div>;
  }

  if (erro) {
    return (
      <div className="text-center mt-5">
        <h2 style={{ color: '#ef4444' }}><i className="fa-solid fa-triangle-exclamation"></i> Ops!</h2>
        <h4 className="text-white">{erro}</h4>
      </div>
    );
  }

  if (!dados) return null;

  return (
    <main className="perfil-page perfil-publico-page">
      <section className="perfil-header-container">
        <div className="perfil-cover" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(5, 8, 22, 0.9))' }}></div>

        <div className="perfil-content-wrapper">
          <div className="perfil-sidebar">
            <div className="perfil-avatar-box">
              {dados.perfil.foto ? (
                <img src={dados.perfil.foto} alt="Foto de Perfil" className="perfil-avatar" />
              ) : (
                <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '4rem', margin: '0 auto' }}>
                  <i className="fa-solid fa-user"></i>
                </div>
              )}
            </div>
          </div>

          <div className="perfil-main-info glass-card">
            <div className="info-header">
              <h1 className="perfil-nome">
                {dados.usuario.nome}
                {dados.usuario.tipo === 'admin' && <span className="badge badge-admin"><i className="fa-solid fa-shield-halved"></i> Admin</span>}
                {dados.usuario.tipo === 'autor' && <span className="badge badge-autor"><i className="fa-solid fa-feather-pointed"></i> Autor</span>}
                {dados.usuario.tipo === 'leitor' && <span className="badge badge-leitor"><i className="fa-solid fa-book-open"></i> Leitor</span>}
              </h1>
              <p className="perfil-username">@{dados.usuario.username}</p>
            </div>

            <div className="info-body">
              <p className="perfil-descricao"><i className="fa-solid fa-quote-left"></i> {dados.perfil.descricao_perfil || "Sem descrição"}</p>
              <p className="perfil-historico"><i className="fa-solid fa-clock-rotate-left"></i> {dados.perfil.historico_txt || "Nenhum livro lido."}</p>
              
              <div className="perfil-meta">
                <div className="meta-item">
                  <i className="fa-solid fa-location-dot"></i>
                  <div>
                    <span className="meta-label">Localização</span>
                    <span className="meta-value">{dados.perfil.localizacao || "Não informado"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="perfil-stats-grid">
        <div className="stat-glass-card">
          <div className="stat-icon" style={{ color: '#60a5fa', background: 'rgba(59,130,246,.2)' }}><i className="fa-solid fa-book-open"></i></div>
          <div className="stat-info">
            <p className="stat-number">{dados.estatisticas.total_lidos}</p>
            <p className="stat-label">Livros Lidos</p>
          </div>
        </div>
        <div className="stat-glass-card">
          <div className="stat-icon" style={{ color: '#60a5fa', background: 'rgba(59,130,246,.2)' }}><i className="fa-solid fa-star"></i></div>
          <div className="stat-info">
            <p className="stat-number">{dados.estatisticas.total_avaliados}</p>
            <p className="stat-label">Avaliados</p>
          </div>
        </div>
        <div className="stat-glass-card">
          <div className="stat-icon" style={{ color: '#60a5fa', background: 'rgba(59,130,246,.2)' }}><i className="fa-solid fa-users"></i></div>
          <div className="stat-info">
            <p className="stat-number">{dados.estatisticas.total_comunidades}</p>
            <p className="stat-label">Comunidades</p>
          </div>
        </div>
      </section>

      <section className="perfil-tabs-section">
        <div className="tabs-nav" style={{ justifyContent: 'center' }}>
          <button className={`tab-btn ${abaAtiva === 'info' ? 'active' : ''}`} onClick={() => setAbaAtiva('info')}>
            <i className="fa-solid fa-circle-info"></i> Informações
          </button>
          <button className={`tab-btn ${abaAtiva === 'historico' ? 'active' : ''}`} onClick={() => setAbaAtiva('historico')}>
            <i className="fa-solid fa-clock-rotate-left"></i> Histórico
          </button>
          <button className={`tab-btn ${abaAtiva === 'favoritos' ? 'active' : ''}`} onClick={() => setAbaAtiva('favoritos')}>
            <i className="fa-solid fa-heart"></i> Favoritos
          </button>
          <button className={`tab-btn ${abaAtiva === 'comunidades' ? 'active' : ''}`} onClick={() => setAbaAtiva('comunidades')}>
            <i className="fa-solid fa-users"></i> Comunidades
          </button>
        </div>

        {abaAtiva === 'info' && (
          <div className="tab-content active">
            <div className="content-glass-card full-width" style={{ textAlign: 'center' }}>
              <h3>Sobre {dados.usuario.nome}</h3>
              <p className="sobre-texto" style={{ margin: '20px auto', maxWidth: '800px', lineHeight: '1.8' }}>
                {dados.perfil.bio || "Nenhuma biografia cadastrada."}
              </p>
            </div>
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div className="tab-content active">
            <div className="historico-list">
              {dados.historico.length > 0 ? (
                dados.historico.map(item => (
                  <div key={item.id} className="historico-item content-glass-card">
                    <div className="historico-icon"><i className="fa-solid fa-book"></i></div>
                    <div className="historico-info">
                      <h4>{item.titulo}</h4>
                      <p className="historico-date">{item.data}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="content-glass-card"><p className="text-muted" style={{ textAlign: 'center' }}>Nenhum histórico encontrado.</p></div>
              )}
            </div>
          </div>
        )}

        {abaAtiva === 'favoritos' && (
          <div className="tab-content active">
            <div className="perfil-info-grid">
              <div className="content-glass-card">
                <h3>Gêneros acessados recentemente</h3>
                <ul className="genres-list" style={{ justifyContent: 'center' }}>
                  {dados.favoritos.generos.length > 0 ? (
                    dados.favoritos.generos.map((genero, i) => <li key={i} className="genre-tag">{genero}</li>)
                  ) : (
                    <p className="text-muted">Nenhum gênero recente ainda.</p>
                  )}
                </ul>
              </div>

              <div className="content-glass-card">
                <h3>Autores acessados recentemente</h3>
                <ul className="authors-list" style={{ alignItems: 'center' }}>
                  {dados.favoritos.autores.length > 0 ? (
                    dados.favoritos.autores.map((autor, i) => <li key={i}><i className="fa-solid fa-pen-nib"></i> {autor}</li>)
                  ) : (
                    <p className="text-muted">Nenhum autor recente ainda.</p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'comunidades' && (
          <div className="tab-content active">
            <div className="favoritos-grid full">
              {dados.comunidades.length > 0 ? (
                dados.comunidades.map(comunidade => (
                  <div key={comunidade.id} className="favorito-card content-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="favorito-capa" style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.15)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <i className="fa-solid fa-users" style={{ fontSize: '3.5rem', color: '#60a5fa' }}></i>
                    </div>
                    <div className="favorito-info" style={{ padding: '20px' }}>
                      <h4>{comunidade.nome}</h4>
                      <p style={{ marginBottom: 0, minHeight: '40px' }}>
                        {comunidade.descricao.length > 60 ? comunidade.descricao.substring(0, 60) + '...' : comunidade.descricao}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="content-glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px' }}>
                  <i className="fa-solid fa-ghost text-muted" style={{ fontSize: '3rem', marginBottom: '15px' }}></i>
                  <p className="text-muted">Este usuário ainda não participa de comunidades.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default PerfilPublico;
