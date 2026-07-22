import { useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Swal from 'sweetalert2';
import api from '../services/api';
import userImg from '../assets/img/user.png';
import '../assets/css/perfil.css'; // O CSS importado

function Profile() {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('info');
  const [fullProfile, setFullProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (user?.username) {
      api.get(`/perfis/${user.username}/`)
        .then(res => setFullProfile(res.data))
        .catch(err => console.error("Erro ao carregar perfil completo", err))
        .finally(() => setLoadingProfile(false));
    }
  }, [user]);

  // Mocks para fallback se a API não retornar
  const stats = fullProfile?.estatisticas || {
    total_lidos: 0,
    lendo_agora: 0, // A ser implementado
    total_avaliados: 0,
    total_comunidades: 0
  };

  const favoritosMock = fullProfile?.favoritos?.livros || [];
  const comunidadesMock = fullProfile?.comunidades || [];

  if (loading || loadingProfile) {
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
              <img src={fullProfile?.perfil?.foto || user?.foto || userImg} alt="Avatar do Usuário" className="perfil-avatar" />
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
                {user?.nome || 'Usuário'}  
                {user?.tipo === 'admin' && <span className="badge badge-admin"><i className="fa-solid fa-shield-halved"></i> Admin</span>}
                {user?.tipo === 'autor' && <span className="badge badge-autor"><i className="fa-solid fa-feather-pointed"></i> Autor</span>}
                {user?.tipo === 'aguardando_aprovacao' && <span className="badge badge-pendente"><i className="fa-solid fa-clock-rotate-left"></i> Em Análise</span>}
                {user?.tipo === 'leitor' && <span className="badge badge-leitor"><i className="fa-solid fa-book-open"></i> Leitor</span>}
              </h1>
              <p className="perfil-username">@{user?.username}</p>
            </div>

            <div className="info-body">
              <p className="perfil-descricao"><i className="fa-solid fa-quote-left"></i> {user?.descricao_perfil || 'Sem status'}</p>
              <p className="perfil-historico">
                <i className="fa-solid fa-clock-rotate-left"></i> 
                Último lido: <strong>O Hobbit</strong>
              </p>
              
              <div className="perfil-meta">
                <div className="meta-item">
                  <i className="fa-solid fa-location-dot"></i>
                  <div>
                    <span className="meta-label">Localização</span>
                    <span className="meta-value">{user?.localizacao || 'Desconhecida'}</span>
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
                <p className="sobre-texto">{user?.bio || 'Nenhuma biografia informada.'}</p>
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
              <form className="config-form" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                data.perfil_privado = formData.get('perfil_privado') === 'on';
                
                // Remover campos read_only do payload para evitar conflitos na API
                delete data.nome;
                delete data.username;

                try {
                  await api.patch('/perfis/meu-perfil/', data);
                  Swal.fire({
                    icon: 'success',
                    title: 'Sucesso!',
                    text: 'Configurações salvas com sucesso.',
                    background: '#1e293b',
                    color: '#fff',
                    confirmButtonColor: '#8b5cf6'
                  });
                } catch (error) {
                  console.error(error);
                  Swal.fire({
                    icon: 'error',
                    title: 'Ops...',
                    text: 'Erro ao salvar as configurações.',
                    background: '#1e293b',
                    color: '#fff',
                    confirmButtonColor: '#8b5cf6'
                  });
                }
              }}>
                <div className="form-grid">
                  {user?.tipo !== 'admin' && (
                    <div className="perfil-form-group full-width" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', border: '1px dashed rgba(139,92,246,0.2)', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: 'white' }}><i className="fa-solid fa-user-shield" style={{ color: '#8b5cf6', marginRight: '8px' }}></i> Modo de Privacidade da Conta</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ao ativar, seu perfil ficará oculto para leitores e autores comuns do ParaBook.</p>
                      </div>
                      <label className="switch-ui" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
                        <input type="checkbox" name="perfil_privado" style={{ opacity: 0, width: 0, height: 0 }} defaultChecked={user?.perfil_privado || false} />
                        <span className="slider-ui" style={{ position: 'absolute', inset: 0, backgroundColor: '#374151', borderRadius: '34px', transition: '.4s' }}></span>
                      </label>
                    </div>
                  )}
                  <div className="perfil-form-group">
                    <label htmlFor="input-nome">Nome de Exibição (Apenas visualização)</label>
                    <input type="text" id="input-nome" name="nome" className="form-input" defaultValue={user?.nome} readOnly style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                  </div>
                  <div className="perfil-form-group">
                    <label htmlFor="input-username">Nome de Usuário (Username)</label>
                    <input type="text" id="input-username" name="username" className="form-input" defaultValue={user?.username} readOnly style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                  </div>
                  <div className="perfil-form-group">
                    <label htmlFor="input-descricao">Frase de Status (Curta)</label>
                    <input type="text" id="input-descricao" name="descricao_perfil" className="form-input" defaultValue={user?.descricao_perfil || ''} />
                  </div>
                  <div className="perfil-form-group">
                    <label htmlFor="input-localizacao">Localização / Cidade</label>
                    <input type="text" id="input-localizacao" name="localizacao" className="form-input" defaultValue={user?.localizacao || ''} />
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
                  <button className="btn-outline" onClick={() => Swal.fire({
                    icon: 'info',
                    title: 'Em breve',
                    text: 'Função de Alterar Senha estará disponível na próxima atualização.',
                    background: '#1e293b',
                    color: '#fff',
                    confirmButtonColor: '#8b5cf6'
                  })}>Alterar Senha</button> 
                  <button className="btn-danger-outline" onClick={() => Swal.fire({
                    icon: 'warning',
                    title: 'Em breve',
                    text: 'Função de Excluir Conta estará disponível na próxima atualização.',
                    background: '#1e293b',
                    color: '#fff',
                    confirmButtonColor: '#ef4444'
                  })}>
                    <i className="fa-solid fa-trash"></i> Excluir conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* PAINEIS ESPECÍFICOS DE TIPO DE USUÁRIO */}
      {user?.tipo === 'admin' && (
        <section className="special-panel admin-panel content-glass-card">
          <div className="panel-info">
            <h3><i className="fa-solid fa-server"></i> Central de Comando</h3>
            <p>Você tem privilégios totais. Acesse o dashboard para gerenciar a plataforma.</p>
          </div>
          <Link to="/dashboard" className="btn-primary-action">Acessar Dashboard <i className="fa-solid fa-arrow-right"></i></Link>
        </section>
      )}

      {user?.tipo === 'autor' && (
        <section className="special-panel autor-panel content-glass-card">
          <div className="panel-info">
            <h3><i className="fa-solid fa-wand-magic-sparkles"></i> Painel do Autor Independente</h3>
            <p>Gerencie suas publicações e veja o alcance das suas obras.</p>
          </div>
          <button className="btn-primary-action"><i className="fa-solid fa-plus"></i> Publicar Novo Livro</button>
        </section>
      )}

      {user?.tipo === 'aguardando_aprovacao' && (
        <section className="special-panel pendente-panel content-glass-card">
          <div className="panel-info">
            <h3 style={{ color: '#fbbf24' }}><i className="fa-solid fa-hourglass-half"></i> Solicitação em Análise</h3>
            <p>Nossa equipe de moderação está avaliando seu pedido para se tornar Autor Independente.</p>
          </div>
        </section>
      )}

      {user?.tipo === 'leitor' && (
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
