import { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import userImg from '../assets/img/user.png';
import '../assets/css/perfil.css'; // O CSS importado

function Profile() {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('info');

  // Mocks para renderização visual
  const mockUser = {
    nome: "Renan Santos",
    username: user?.username || "renan_santos",
    tipo: "admin", // Opções: 'admin', 'autor', 'aguardando_aprovacao', 'leitor'
    foto: null,
    descricao_perfil: "Desenvolvedor e Leitor Assíduo.",
    localizacao: "Belém - PA",
    bio: "Amante da tecnologia e de boas histórias. Criador do ParaBook.",
    perfil_privado: false
  };

  const stats = {
    total_lidos: 42,
    lendo_agora: 2,
    total_avaliados: 30,
    total_comunidades: 5
  };

  const favoritosMock = [
    { id: 1, titulo: "O Senhor dos Anéis", autor: "J.R.R. Tolkien", capa: null },
    { id: 2, titulo: "Duna", autor: "Frank Herbert", capa: null }
  ];

  const comunidadesMock = [
    { id: 1, nome: "Clube do Sci-Fi", descricao: "Para amantes de ficção científica." }
  ];

  if (loading) {
    return <div className="text-center mt-5" style={{ color: 'white' }}>Carregando perfil...</div>;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <main className="perfil-page">
      {/* PERFIL HEADER */}
      <section className="perfil-header-container">
        <div className="perfil-cover">
            {/* Capa com gradiente e blur inspirado na Home */}
        </div>

        <div className="perfil-content-wrapper">
          <div className="perfil-sidebar">
            <div className="perfil-avatar-box">
              <img src={mockUser.foto || userImg} alt="Avatar do Usuário" className="perfil-avatar" />
              <input type="file" id="inputFotoOculto" accept="image/*" style={{ display: 'none' }} />

              <div style={{ position: 'absolute', bottom: '5px', right: '-15px', display: 'flex', gap: '8px' }}>
                <button className="btn-editar-avatar" id="btnTrocarFoto" title="Trocar Foto" style={{ position: 'static' }}>
                  <i className="fa-solid fa-camera"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="perfil-main-info glass-card">
            <div className="info-header">
              <h1 className="perfil-nome"> 
                {mockUser.nome}  
                {mockUser.tipo === 'admin' && <span className="badge badge-admin"><i className="fa-solid fa-shield-halved"></i> Admin</span>}
                {mockUser.tipo === 'autor' && <span className="badge badge-autor"><i className="fa-solid fa-feather-pointed"></i> Autor</span>}
                {mockUser.tipo === 'aguardando_aprovacao' && <span className="badge badge-pendente"><i className="fa-solid fa-clock-rotate-left"></i> Em Análise</span>}
                {mockUser.tipo === 'leitor' && <span className="badge badge-leitor"><i className="fa-solid fa-book-open"></i> Leitor</span>}
              </h1>
              <p className="perfil-username">@{mockUser.username}</p>
            </div>

            <div className="info-body">
              <p className="perfil-descricao"><i className="fa-solid fa-quote-left"></i> {mockUser.descricao_perfil}</p>
              <p className="perfil-historico">
                <i className="fa-solid fa-clock-rotate-left"></i> 
                Último lido: <strong>O Hobbit</strong>
              </p>
              
              <div className="perfil-meta">
                <div className="meta-item">
                  <i className="fa-solid fa-location-dot"></i>
                  <div>
                    <span className="meta-label">Localização</span>
                    <span className="meta-value">{mockUser.localizacao}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ESTATÍSTICAS */}
      <section className="perfil-stats-grid">
        <div className="stat-glass-card">
          <div className="stat-icon"><i className="fa-solid fa-book-open"></i></div>
          <div className="stat-info">
            <p className="stat-number">{stats.total_lidos}</p>
            <p className="stat-label">Livros Lidos</p>
          </div>
        </div>
        <div className="stat-glass-card">
          <div className="stat-icon"><i className="fa-solid fa-book-reader"></i></div>
          <div className="stat-info">
            <p className="stat-number">{stats.lendo_agora}</p>
            <p className="stat-label">Lendo Agora</p>
          </div>
        </div>
        <div className="stat-glass-card">
          <div className="stat-icon"><i className="fa-solid fa-star"></i></div>
          <div className="stat-info">
            <p className="stat-number">{stats.total_avaliados}</p>
            <p className="stat-label">Avaliados</p>
          </div>
        </div>
        <div className="stat-glass-card">
          <div className="stat-icon"><i className="fa-solid fa-users"></i></div>
          <div className="stat-info">
            <p className="stat-number">{stats.total_comunidades}</p>
            <p className="stat-label">Comunidades</p>
          </div>
        </div>
      </section>

      {/* ABAS DE NAVEGAÇÃO */}
      <section className="perfil-tabs-section">
        <div className="tabs-nav">
          <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
            <i className="fa-solid fa-circle-info"></i> Informações
          </button>
          <button className={`tab-btn ${activeTab === 'historico' ? 'active' : ''}`} onClick={() => setActiveTab('historico')} style={{ display: 'none' }}>
            <i className="fa-solid fa-clock-rotate-left"></i> Histórico
          </button>
          <button className={`tab-btn ${activeTab === 'favoritos' ? 'active' : ''}`} onClick={() => setActiveTab('favoritos')}>
            <i className="fa-solid fa-heart"></i> Favoritos
          </button>
          <button className={`tab-btn ${activeTab === 'comunidades' ? 'active' : ''}`} onClick={() => setActiveTab('comunidades')}>
            <i className="fa-solid fa-users"></i> Comunidades
          </button>
          <button className={`tab-btn ${activeTab === 'configuracoes' ? 'active' : ''}`} onClick={() => setActiveTab('configuracoes')}>
            <i className="fa-solid fa-gear"></i> Configurações
          </button>
        </div>

        {/* TAB INFO */}
        {activeTab === 'info' && (
          <div className="tab-content active">
            <div className="perfil-info-grid">
              <div className="content-glass-card full-width">
                <h3>Sobre Você</h3>
                <p className="sobre-texto">{mockUser.bio}</p>
                <button className="btn-primary-action">
                  <i className="fa-solid fa-pen-to-square"></i> Trocar Biografia
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB FAVORITOS */}
        {activeTab === 'favoritos' && (
          <div className="tab-content active">
            <div className="favoritos-grid full">
              {favoritosMock.map((livro) => (
                <div key={livro.id} className="favorito-card content-glass-card">
                  <div className="favorito-capa">
                    {livro.capa ? (
                      <img src={livro.capa} alt={livro.titulo} />
                    ) : (
                      <i className="fa-solid fa-book-open" style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.1)' }}></i>
                    )}
                  </div>
                  <div className="favorito-info">
                    <h4>{livro.titulo}</h4>
                    <p>{livro.autor}</p>
                    <button className="btn-danger-outline btn-remover-favorito">
                      <i className="fa-solid fa-xmark"></i> Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB COMUNIDADES */}
        {activeTab === 'comunidades' && (
          <div className="tab-content active">
            <div className="favoritos-grid full">
              {comunidadesMock.map((comunidade) => (
                <div key={comunidade.id} className="favorito-card content-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="favorito-capa" style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.15)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <i className="fa-solid fa-users" style={{ fontSize: '3.5rem', color: '#8b5cf6' }}></i>
                  </div>
                  <div className="favorito-info" style={{ padding: '20px' }}>
                    <h4>{comunidade.nome}</h4>
                    <p style={{ marginBottom: '15px', minHeight: '40px' }}>{comunidade.descricao}</p>
                    <Link to={`/comunidades/${comunidade.id}`} className="btn-outline" style={{ width: '100%', justifyContent: 'center', textAlign: 'center' }}>
                      Acessar Comunidade
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONFIGURAÇÕES */}
        {activeTab === 'configuracoes' && (
          <div className="tab-content active">
            <div className="config-container content-glass-card full-width">
              <h2>Configurações da Conta</h2>
              <form className="config-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-grid">
                  {mockUser.tipo !== 'admin' && (
                    <div className="perfil-form-group full-width" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', border: '1px dashed rgba(139,92,246,0.2)', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: 'white' }}><i className="fa-solid fa-user-shield" style={{ color: '#8b5cf6', marginRight: '8px' }}></i> Modo de Privacidade da Conta</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ao ativar, seu perfil ficará oculto para leitores e autores comuns do ParaBook.</p>
                      </div>
                      <label className="switch-ui" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
                        <input type="checkbox" name="perfil_privado" style={{ opacity: 0, width: 0, height: 0 }} defaultChecked={mockUser.perfil_privado} />
                        <span className="slider-ui" style={{ position: 'absolute', inset: 0, backgroundColor: '#374151', borderRadius: '34px', transition: '.4s' }}></span>
                      </label>
                    </div>
                  )}
                  <div className="perfil-form-group">
                    <label htmlFor="input-nome">Nome de Exibição</label>
                    <input type="text" id="input-nome" name="nome" className="form-input" defaultValue={mockUser.nome} />
                  </div>
                  <div className="perfil-form-group">
                    <label htmlFor="input-username">Nome de Usuário (Username)</label>
                    <input type="text" id="input-username" name="username" className="form-input" defaultValue={mockUser.username} />
                  </div>
                  <div className="perfil-form-group">
                    <label htmlFor="input-descricao">Frase de Status (Curta)</label>
                    <input type="text" id="input-descricao" name="descricao_perfil" className="form-input" defaultValue={mockUser.descricao_perfil} />
                  </div>
                  <div className="perfil-form-group">
                    <label htmlFor="input-localizacao">Localização / Cidade</label>
                    <input type="text" id="input-localizacao" name="localizacao" className="form-input" defaultValue={mockUser.localizacao} />
                  </div>
                </div>
                <button type="submit" className="btn-primary-action" style={{ marginTop: '20px' }}>
                  <i className="fa-solid fa-floppy-disk"></i> Salvar Alterações
                </button>
              </form>

              <div className="danger-zone">
                <div className="danger-text">
                  <h4>Segurança da Conta</h4>
                  <p>Gerencie sua senha ou encerre sua conta.</p>
                </div>
                <div className="danger-actions">
                  <button className="btn-outline">Alterar Senha</button> 
                  <button className="btn-danger-outline">
                    <i className="fa-solid fa-trash"></i> Excluir conta
                  </button>
                  <button className="btn-outline ms-2" onClick={handleLogout}>
                    <i className="fa-solid fa-right-from-bracket"></i> Sair da Conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* PAINEIS ESPECÍFICOS DE TIPO DE USUÁRIO */}
      {mockUser.tipo === 'admin' && (
        <section className="special-panel admin-panel content-glass-card">
          <div className="panel-info">
            <h3><i className="fa-solid fa-server"></i> Central de Comando</h3>
            <p>Você tem privilégios totais. Acesse o dashboard para gerenciar a plataforma.</p>
          </div>
          <Link to="/dashboard" className="btn-primary-action">Acessar Dashboard <i className="fa-solid fa-arrow-right"></i></Link>
        </section>
      )}

      {mockUser.tipo === 'autor' && (
        <section className="special-panel autor-panel content-glass-card">
          <div className="panel-info">
            <h3><i className="fa-solid fa-wand-magic-sparkles"></i> Painel do Autor Independente</h3>
            <p>Gerencie suas publicações e veja o alcance das suas obras.</p>
          </div>
          <button className="btn-primary-action"><i className="fa-solid fa-plus"></i> Publicar Novo Livro</button>
        </section>
      )}

      {mockUser.tipo === 'aguardando_aprovacao' && (
        <section className="special-panel pendente-panel content-glass-card">
          <div className="panel-info">
            <h3 style={{ color: '#fbbf24' }}><i className="fa-solid fa-hourglass-half"></i> Solicitação em Análise</h3>
            <p>Nossa equipe de moderação está avaliando seu pedido para se tornar Autor Independente.</p>
          </div>
        </section>
      )}

      {mockUser.tipo === 'leitor' && (
        <section className="special-panel upgrade-panel content-glass-card">
          <div className="panel-info">
            <h3>Escreve ou deseja publicar suas próprias obras?</h3>
            <p>Mude sua conta para Autor Independente e comece a compartilhar suas histórias.</p>
          </div>
          <button className="btn-primary-action">
            <i className="fa-solid fa-feather"></i> Quero ser um Autor
          </button>
        </section>
      )}
    </main>
  );
}

export default Profile;
