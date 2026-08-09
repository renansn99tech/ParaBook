import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Swal from 'sweetalert2';
import '../assets/css/conteudo-comunidade.css';

const swalTema = {
  background: '#1e293b',
  color: '#fff',
  confirmButtonColor: '#8b5cf6'
};

function ConteudoComunidade() {
  const { id } = useParams();
  const { user, loading: carregandoUsuario } = useContext(AuthContext);
  const navigate = useNavigate();

  const [comunidade, setComunidade] = useState(null);
  const [postagens, setPostagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState('');
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);

  // Config state
  const [showConfig, setShowConfig] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Lista de membros (retrátil, carregada sob demanda)
  const [showMembros, setShowMembros] = useState(false);
  const [membros, setMembros] = useState(null);
  const [carregandoMembros, setCarregandoMembros] = useState(false);

  useEffect(() => {
    // Espera o AuthContext resolver: sem isso um membro legítimo seria
    // expulso da comunidade desativada só porque `user` ainda era null.
    if (carregandoUsuario) return;

    const fetchDados = async () => {
      try {
        const [comunidadeRes, postagensRes] = await Promise.all([
          api.get(`/comunidades/comunidades/${id}/`),
          api.get(`/comunidades/postagens/?comunidade=${id}`)
        ]);
        setComunidade(comunidadeRes.data);

        // Comunidade desativada é inacessível para todos menos o admin,
        // que precisa entrar para reativá-la nas Configurações.
        if (comunidadeRes.data.em_manutencao && !user?.is_superuser) {
          await Swal.fire({
            ...swalTema,
            icon: 'info',
            title: 'Comunidade Desativada Temporariamente',
            text: 'Este espaço foi fechado para ajustes pela equipe do ParaBook. Volte em breve.',
            confirmButtonText: 'Voltar para Comunidades'
          });
          navigate('/comunidades');
          return;
        }

        let pData = postagensRes.data.results || postagensRes.data;
        // Sort newest first
        pData.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
        setPostagens(pData);
      } catch (error) {
        console.error("Erro ao carregar conteúdo da comunidade", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, [id, carregandoUsuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPostId) {
        const res = await api.patch(`/comunidades/postagens/${editingPostId}/`, { titulo, conteudo });
        setPostagens(postagens.map(p => p.id === editingPostId ? res.data : p));
        Swal.fire('Sucesso!', 'A postagem foi atualizada.', 'success');
      } else {
        const novaPostagem = {
          comunidade: id,
          titulo,
          conteudo,
        };
        const res = await api.post('/comunidades/postagens/', novaPostagem);
        setPostagens([res.data, ...postagens]);
        Swal.fire('Sucesso!', 'Sua postagem foi criada.', 'success');
      }
      setTitulo('');
      setConteudo('');
      setEditingPostId(null);
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao salvar postagem", error);
      Swal.fire('Erro', 'Ocorreu um erro ao salvar a postagem.', 'error');
    }
  };

  const handleEditClick = (post) => {
    setTitulo(post.titulo);
    setConteudo(post.conteudo);
    setEditingPostId(post.id);
    setShowForm(true);
    // Rola para o topo do form
    window.scrollTo({ top: document.getElementById('form-postagem').offsetTop - 100, behavior: 'smooth' });
  };

  const handleNovaPostagemClick = () => {
    setTitulo('');
    setConteudo('');
    setEditingPostId(null);
    setShowForm(!showForm);
    setShowConfig(false); // Fecha config se abrir postagem
  };

  const handleConfigClick = () => {
    setNovoNome(comunidade.nome);
    setNovaDescricao(comunidade.descricao);
    setShowConfig(!showConfig);
    setShowForm(false); // Fecha form se abrir config
  };

  const handleSalvarConfig = async () => {
    setSalvandoConfig(true);
    try {
      const res = await api.patch(`/comunidades/comunidades/${id}/`, {
        nome: novoNome.trim(),
        descricao: novaDescricao.trim()
      });
      setComunidade(res.data);
      Swal.fire({ ...swalTema, icon: 'success', title: 'Sucesso!', text: 'Comunidade atualizada.' });
      setShowConfig(false);
    } catch (error) {
      console.error("Erro ao atualizar comunidade", error);
      const dados = error.response?.data;
      const mensagem = dados?.detail
        || Object.values(dados || {}).flat()[0]
        || 'Ocorreu um erro ao atualizar as configurações.';
      Swal.fire({ ...swalTema, icon: 'error', title: 'Erro', text: mensagem });
    } finally {
      setSalvandoConfig(false);
    }
  };

  const handleToggleMembros = async () => {
    const abrindo = !showMembros;
    setShowMembros(abrindo);

    // Só busca na primeira abertura; depois reaproveita o que já veio.
    if (abrindo && membros === null) {
      setCarregandoMembros(true);
      try {
        const res = await api.get(`/comunidades/comunidades/${id}/membros/`);
        setMembros(res.data);
      } catch (error) {
        console.error("Erro ao carregar membros", error);
        Swal.fire({ ...swalTema, icon: 'error', title: 'Erro', text: 'Não foi possível carregar a lista de membros.' });
        setShowMembros(false);
      } finally {
        setCarregandoMembros(false);
      }
    }
  };

  const handleDesativar = async () => {
    const desativando = !comunidade.em_manutencao;

    const confirmacao = await Swal.fire({
      ...swalTema,
      icon: 'warning',
      title: desativando ? 'Desativar comunidade?' : 'Reativar comunidade?',
      html: desativando
        ? `<strong>${comunidade.nome}</strong> sairá da lista pública e ficará inacessível.
           Os membros continuarão vendo-a marcada como desativada.`
        : `<strong>${comunidade.nome}</strong> voltará a aparecer para todos os leitores.`,
      showCancelButton: true,
      confirmButtonText: desativando ? 'Sim, desativar' : 'Sim, reativar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: desativando ? '#ef4444' : '#22c55e'
    });

    if (!confirmacao.isConfirmed) return;

    try {
      const res = await api.post(`/comunidades/comunidades/${id}/desativar/`);
      setComunidade({ ...comunidade, em_manutencao: res.data.em_manutencao });
      Swal.fire({
        ...swalTema,
        icon: 'success',
        title: res.data.em_manutencao ? 'Comunidade desativada' : 'Comunidade reativada',
        text: res.data.detail
      });
    } catch (error) {
      console.error("Erro ao desativar comunidade", error);
      Swal.fire({
        ...swalTema,
        icon: 'error',
        title: 'Erro',
        text: error.response?.data?.detail || 'Não foi possível alterar o status da comunidade.'
      });
    }
  };

  const handleExcluirComunidade = async () => {
    const confirmacao = await Swal.fire({
      ...swalTema,
      icon: 'warning',
      title: 'Excluir comunidade?',
      html: `Todas as postagens de <strong>${comunidade.nome}</strong> serão perdidas. Esta ação não pode ser desfeita.`,
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (!confirmacao.isConfirmed) return;

    try {
      await api.delete(`/comunidades/comunidades/${id}/`);
      await Swal.fire({
        ...swalTema,
        icon: 'success',
        title: 'Comunidade excluída',
        text: 'O espaço foi removido da plataforma.'
      });
      navigate('/comunidades');
    } catch (error) {
      console.error("Erro ao excluir comunidade", error);
      Swal.fire({
        ...swalTema,
        icon: 'error',
        title: 'Erro',
        text: error.response?.data?.detail || 'Não foi possível excluir a comunidade.'
      });
    }
  };

  const handleExcluir = async (postId) => {
    const result = await Swal.fire({
      title: 'Apagar postagem?',
      text: "Essa ação não poderá ser desfeita.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/comunidades/postagens/${postId}/`);
        setPostagens(postagens.filter(p => p.id !== postId));
        Swal.fire('Excluído!', 'A postagem foi apagada.', 'success');
      } catch (error) {
        console.error("Erro ao excluir", error);
        Swal.fire('Erro', 'Ocorreu um erro ao excluir a postagem.', 'error');
      }
    }
  };

  const postsFiltrados = postagens.filter(p => 
    p.titulo.toLowerCase().includes(busca.toLowerCase()) || 
    p.conteudo.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return <div className="text-center text-white p-5 mt-5">Carregando...</div>;
  }

  if (!comunidade) {
    return <div className="text-center text-white p-5 mt-5">Comunidade não encontrada.</div>;
  }

  return (
    <main id="topo">
      <section className="banner-comunidade">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2>
              {comunidade.nome}
              {comunidade.em_manutencao && (
                <span className="badge ms-2" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '0.9rem', verticalAlign: 'middle' }}>
                  <i className="fa-solid fa-power-off me-1"></i>Desativada
                </span>
              )}
            </h2>
            <p>{comunidade.descricao}</p>
          </div>
        </div>
      </section>

      <section className="posts-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={{ marginBottom: 0, color: 'white' }}>Postagens</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {user && (user.is_superuser || (!comunidade.criada_por_sistema && comunidade.criador === user.usuario)) && (
              <button onClick={handleConfigClick} className="btn-primary-action" style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)', color: '#fcd34d' }} title="Editar Comunidade">
                <i className="fa-solid fa-gear"></i> Configurações da Comunidade
              </button>
            )}
            {user && !comunidade.criada_por_sistema && comunidade.criador === user.usuario && (
              <button onClick={handleExcluirComunidade} className="btn-primary-action" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' }} title="Excluir Comunidade">
                <i className="fa-solid fa-trash"></i> Excluir Comunidade
              </button>
            )}
            {comunidade.usuario_participa && (
              <button onClick={handleNovaPostagemClick} className="btn-primary-action">
                <i className={`fa-solid ${showForm ? 'fa-minus' : 'fa-plus'}`}></i> {showForm ? 'Cancelar Edição' : 'Nova Postagem'}
              </button>
            )}
          </div>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar posts..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {showConfig && (
          <section className="post-form-container" style={{ marginBottom: '30px', animation: 'fadeIn 0.3s ease-in-out' }}>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>Configurações da Comunidade</h3>

            <div className="form-group">
              <label style={{ color: '#94a3b8', marginBottom: '5px', display: 'block' }}>Nome da Comunidade</label>
              <input
                type="text"
                maxLength={100}
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
              />
            </div>

            <div className="form-group mt-3">
              <label style={{ color: '#94a3b8', marginBottom: '5px', display: 'block' }}>Descrição da Comunidade</label>
              <textarea
                rows="4"
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontFamily: 'inherit' }}
              ></textarea>
              <button
                onClick={handleSalvarConfig}
                disabled={salvandoConfig || !novoNome.trim() || !novaDescricao.trim()}
                className="btn btn-primary mt-3 fw-bold px-4 py-2"
                style={{ borderRadius: '8px', alignSelf: 'flex-start' }}
              >
                {salvandoConfig ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '25px', paddingTop: '25px' }}>
              {/* Lista de membros retrátil */}
              <button
                onClick={handleToggleMembros}
                aria-expanded={showMembros}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: showMembros ? '0' : '15px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: showMembros ? '8px 8px 0 0' : '8px', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ color: '#cbd5e1', fontWeight: '500' }}>
                  <i className="fa-solid fa-users me-2"></i>Lista de Membros
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge" style={{ background: 'rgba(139,92,246,0.25)', color: '#c4b5fd' }}>
                    {membros ? membros.total : comunidade.total_membros}/{comunidade.max_participantes}
                  </span>
                  <i className={`fa-solid ${showMembros ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#94a3b8' }}></i>
                </span>
              </button>

              {showMembros && (
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '0 0 8px 8px', padding: '10px 15px', marginBottom: '15px', maxHeight: '260px', overflowY: 'auto' }}>
                  {carregandoMembros && <p style={{ color: '#94a3b8', margin: '10px 0' }}>Carregando membros...</p>}

                  {!carregandoMembros && membros?.membros?.length === 0 && (
                    <p style={{ color: '#94a3b8', margin: '10px 0' }}>Esta comunidade ainda não tem membros.</p>
                  )}

                  {!carregandoMembros && membros?.membros?.map((membro) => (
                    <div
                      key={membro.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <Link to={`/perfil/${membro.username}`} style={{ color: '#e2e8f0', textDecoration: 'none' }}>
                        <i className="fa-solid fa-user me-2" style={{ color: '#64748b' }}></i>
                        {membro.nome_exibicao}
                        <small style={{ color: '#64748b', marginLeft: '8px' }}>@{membro.username}</small>
                      </Link>
                      {membro.e_criador && (
                        <span className="badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                          <i className="fa-solid fa-crown me-1"></i>Criador
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Desativar: só admin, e só em comunidade oficial do ParaBook */}
              {user?.is_superuser && comunidade.criada_por_sistema && (
                <button
                  onClick={handleDesativar}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: comunidade.em_manutencao ? 'rgba(34,197,94,0.05)' : 'rgba(239, 68, 68, 0.05)', padding: '15px', borderRadius: '8px', border: `1px dashed ${comunidade.em_manutencao ? 'rgba(34,197,94,0.4)' : 'rgba(239, 68, 68, 0.3)'}`, cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ color: comunidade.em_manutencao ? '#86efac' : '#fca5a5', fontWeight: '500' }}>
                    <i className="fa-solid fa-power-off me-2"></i>
                    {comunidade.em_manutencao ? 'Reativar Comunidade' : 'Desativar Comunidade'}
                  </span>
                  {comunidade.em_manutencao && (
                    <span className="badge" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>Desativada</span>
                  )}
                </button>
              )}
            </div>
          </section>
        )}

        {showForm && (
          <section id="form-postagem" className="post-form-container" style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>{editingPostId ? 'Editar Postagem' : 'Adicionar Postagem'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label style={{ color: '#94a3b8', marginBottom: '5px', display: 'block' }}>Título</label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                />
              </div>
              <div className="form-group mt-3">
                <label style={{ color: '#94a3b8', marginBottom: '5px', display: 'block' }}>Conteúdo</label>
                <textarea
                  required
                  rows="4"
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontFamily: 'inherit' }}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary mt-3 fw-bold px-4 py-2" style={{ borderRadius: '8px' }}>
                {editingPostId ? 'Salvar Alterações' : 'Publicar'}
              </button>
            </form>
          </section>
        )}

        <div id="lista-posts">
          {postsFiltrados.length > 0 ? (
            postsFiltrados.map(post => (
              <div className="post-card" key={post.id}>
                <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div>
                    <h4 className="post-title" style={{ color: 'white', marginBottom: '5px' }}>{post.titulo}</h4>
                    <p className="post-author mb-3" style={{ fontSize: '0.85rem' }}>
                      <Link to={`/perfil/${post.autor_nome}`} style={{ color: '#c4b5fd', fontWeight: '500', textDecoration: 'none' }}>@{post.autor_nome}</Link>
                      <span className="post-date text-muted ms-2">• {new Date(post.criado_em).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="post-actions d-flex gap-2">
                    {user && user.usuario === post.autor && (
                      <button onClick={() => handleEditClick(post)} className="btn-primary-outline" style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#a5b4fc' }} title="Editar postagem">
                        <i className="fa-solid fa-pen"></i>
                      </button>
                    )}
                    {user && (user.usuario === post.autor || user.is_superuser) && (
                      <button onClick={() => handleExcluir(post.id)} className="btn-danger-outline" style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }} title="Remover postagem">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="post-content" style={{ color: '#e2e8f0', lineHeight: '1.6' }}>
                  {post.conteudo}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state text-center p-5" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <i className="fas fa-comments fs-2 text-muted mb-3"></i>
              <p className="text-muted m-0">Nenhuma postagem encontrada.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ConteudoComunidade;
