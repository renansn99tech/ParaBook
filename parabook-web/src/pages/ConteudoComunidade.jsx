import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import swal, { BOTAO } from '../services/swal';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/conteudo-comunidade.css';

function ConteudoComunidade() {
  const { id } = useParams();
  const { user, loading: carregandoUsuario } = useContext(AuthContext);
  const navigate = useNavigate();

  const [comunidade, setComunidade] = useState(null);
  const [postagens, setPostagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState('');
  const paginaRef = useRevelacao([comunidade, postagens, busca, loading]);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [postRespostasAberto, setPostRespostasAberto] = useState(null);
  const [respostasPorPost, setRespostasPorPost] = useState({});
  const [carregandoRespostas, setCarregandoRespostas] = useState(null);
  const [novaResposta, setNovaResposta] = useState('');
  const [enviandoResposta, setEnviandoResposta] = useState(false);

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
          await swal.fire({
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
  }, [id, carregandoUsuario, navigate, user?.is_superuser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPostId) {
        const res = await api.patch(`/comunidades/postagens/${editingPostId}/`, { titulo, conteudo });
        setPostagens(postagens.map(p => p.id === editingPostId ? res.data : p));
        swal.fire('Sucesso!', 'A postagem foi atualizada.', 'success');
      } else {
        const novaPostagem = {
          comunidade: id,
          titulo,
          conteudo,
        };
        const res = await api.post('/comunidades/postagens/', novaPostagem);
        setPostagens([res.data, ...postagens]);
        swal.fire('Sucesso!', 'Sua postagem foi criada.', 'success');
      }
      setTitulo('');
      setConteudo('');
      setEditingPostId(null);
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao salvar postagem", error);
      swal.fire('Erro', 'Ocorreu um erro ao salvar a postagem.', 'error');
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
      swal.fire({ icon: 'success', title: 'Sucesso!', text: 'Comunidade atualizada.' });
      setShowConfig(false);
    } catch (error) {
      console.error("Erro ao atualizar comunidade", error);
      const dados = error.response?.data;
      const mensagem = dados?.detail
        || Object.values(dados || {}).flat()[0]
        || 'Ocorreu um erro ao atualizar as configurações.';
      swal.fire({ icon: 'error', title: 'Erro', text: mensagem });
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
        swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar a lista de membros.' });
        setShowMembros(false);
      } finally {
        setCarregandoMembros(false);
      }
    }
  };

  const handleDesativar = async () => {
    const desativando = !comunidade.em_manutencao;

    const confirmacao = await swal.fire({
      icon: 'warning',
      title: desativando ? 'Desativar comunidade?' : 'Reativar comunidade?',
      html: desativando
        ? `<strong>${comunidade.nome}</strong> sairá da lista pública e ficará inacessível.
           Os membros continuarão vendo-a marcada como desativada.`
        : `<strong>${comunidade.nome}</strong> voltará a aparecer para todos os leitores.`,
      showCancelButton: true,
      confirmButtonText: desativando ? 'Sim, desativar' : 'Sim, reativar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: desativando ? BOTAO.perigo : BOTAO.sucesso
    });

    if (!confirmacao.isConfirmed) return;

    try {
      const res = await api.post(`/comunidades/comunidades/${id}/desativar/`);
      setComunidade({ ...comunidade, em_manutencao: res.data.em_manutencao });
      swal.fire({
        icon: 'success',
        title: res.data.em_manutencao ? 'Comunidade desativada' : 'Comunidade reativada',
        text: res.data.detail
      });
    } catch (error) {
      console.error("Erro ao desativar comunidade", error);
      swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.response?.data?.detail || 'Não foi possível alterar o status da comunidade.'
      });
    }
  };

  const handleExcluirComunidade = async () => {
    const confirmacao = await swal.fire({
      icon: 'warning',
      title: 'Excluir comunidade?',
      html: `Todas as postagens de <strong>${comunidade.nome}</strong> serão perdidas. Esta ação não pode ser desfeita.`,
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: BOTAO.perigo
    });

    if (!confirmacao.isConfirmed) return;

    try {
      await api.delete(`/comunidades/comunidades/${id}/`);
      await swal.fire({
        icon: 'success',
        title: 'Comunidade excluída',
        text: 'O espaço foi removido da plataforma.'
      });
      navigate('/comunidades');
    } catch (error) {
      console.error("Erro ao excluir comunidade", error);
      swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.response?.data?.detail || 'Não foi possível excluir a comunidade.'
      });
    }
  };

  const handleExcluir = async (postId) => {
    const result = await swal.fire({
      title: 'Apagar postagem?',
      text: "Essa ação não poderá ser desfeita.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: BOTAO.perigo,
      cancelButtonColor: BOTAO.neutro,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/comunidades/postagens/${postId}/`);
        setPostagens(postagens.filter(p => p.id !== postId));
        swal.fire('Excluído!', 'A postagem foi apagada.', 'success');
      } catch (error) {
        console.error("Erro ao excluir", error);
        swal.fire('Erro', 'Ocorreu um erro ao excluir a postagem.', 'error');
      }
    }
  };

  const handleToggleRespostas = async (postId) => {
    if (postRespostasAberto === postId) {
      setPostRespostasAberto(null);
      setNovaResposta('');
      return;
    }
    setPostRespostasAberto(postId);
    setNovaResposta('');
    if (respostasPorPost[postId]) return;
    setCarregandoRespostas(postId);
    try {
      const res = await api.get(`/comunidades/respostas/?postagem=${postId}`);
      setRespostasPorPost((atual) => ({
        ...atual,
        [postId]: res.data.results || res.data,
      }));
    } catch (error) {
      console.error('Erro ao carregar respostas', error);
      swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar as respostas.' });
    } finally {
      setCarregandoRespostas(null);
    }
  };

  const handleResponder = async (evento, postId) => {
    evento.preventDefault();
    const conteudoResposta = novaResposta.trim();
    if (!conteudoResposta) return;
    setEnviandoResposta(true);
    try {
      const res = await api.post('/comunidades/respostas/', {
        postagem: postId,
        conteudo: conteudoResposta,
      });
      setRespostasPorPost((atual) => ({
        ...atual,
        [postId]: [...(atual[postId] || []), res.data],
      }));
      setPostagens((atuais) => atuais.map((postagem) => (
        postagem.id === postId
          ? { ...postagem, total_respostas: (postagem.total_respostas || 0) + 1 }
          : postagem
      )));
      setNovaResposta('');
    } catch (error) {
      console.error('Erro ao publicar resposta', error);
      swal.fire({ icon: 'error', title: 'Erro', text: error.response?.data?.detail || 'Não foi possível publicar sua resposta.' });
    } finally {
      setEnviandoResposta(false);
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
    <main id="topo" className="pagina-comunidade" ref={paginaRef}>
      <section className="banner-comunidade" data-revelar>
        <div>
          <h2>
            {comunidade.nome}
            {comunidade.em_manutencao && (
              <span className="badge perigo ms-2">
                <i className="fa-solid fa-power-off me-1"></i>Desativada
              </span>
            )}
          </h2>
          <p>{comunidade.descricao}</p>
        </div>
      </section>

      <section className="posts-section">
        <div className="linha-titulo" data-revelar>
          <h3>Postagens</h3>
          <div className="acoes">
            {user && (user.is_superuser || (!comunidade.criada_por_sistema && comunidade.criador === user.usuario)) && (
              <button onClick={handleConfigClick} className="btn-primary-action aviso" title="Editar Comunidade">
                <i className="fa-solid fa-gear"></i> Configurações da Comunidade
              </button>
            )}
            {user && !comunidade.criada_por_sistema && comunidade.criador === user.usuario && (
              <button onClick={handleExcluirComunidade} className="btn-primary-action perigo" title="Excluir Comunidade">
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

        <div className="search-box" data-revelar>
          <input
            type="text"
            placeholder="Buscar posts..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {showConfig && (
          <section className="post-form-container painel-config">
            <h3>Configurações da Comunidade</h3>

            <div className="form-group">
              <label htmlFor="comunidade-nome">Nome da Comunidade</label>
              <input
                id="comunidade-nome"
                type="text"
                maxLength={100}
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
            </div>

            <div className="form-group mt-3">
              <label htmlFor="comunidade-descricao">Descrição da Comunidade</label>
              <textarea
                id="comunidade-descricao"
                rows="4"
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
              ></textarea>
              <button
                onClick={handleSalvarConfig}
                disabled={salvandoConfig || !novoNome.trim() || !novaDescricao.trim()}
                className="btn-primary mt-3"
              >
                {salvandoConfig ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

            <div className="painel-secao">
              {/* Lista de membros retrátil */}
              <button
                onClick={handleToggleMembros}
                aria-expanded={showMembros}
                className={`painel-toggle ${showMembros ? 'aberto' : ''}`}
              >
                <span className="rotulo">
                  <i className="fa-solid fa-users"></i>Lista de Membros
                </span>
                <span className="direita">
                  <span className="badge roxo">
                    {membros ? membros.total : comunidade.total_membros}/{comunidade.max_participantes}
                  </span>
                  <i className={`fa-solid chevron ${showMembros ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                </span>
              </button>

              {showMembros && (
                <div className="lista-membros">
                  {carregandoMembros && <p className="texto-apoio">Carregando membros...</p>}

                  {!carregandoMembros && membros?.membros?.length === 0 && (
                    <p className="texto-apoio">Esta comunidade ainda não tem membros.</p>
                  )}

                  {!carregandoMembros && membros?.membros?.map((membro) => (
                    <div key={membro.id} className="membro-linha">
                      <Link to={`/perfil/${membro.username}`}>
                        <i className="fa-solid fa-user me-2"></i>
                        {membro.nome_exibicao}
                        <small>@{membro.username}</small>
                      </Link>
                      {membro.e_criador && (
                        <span className="badge aviso">
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
                  className={`painel-toggle ${comunidade.em_manutencao ? 'acao-ativar' : 'acao-desativar'}`}
                >
                  <span className="rotulo">
                    <i className="fa-solid fa-power-off"></i>
                    {comunidade.em_manutencao ? 'Reativar Comunidade' : 'Desativar Comunidade'}
                  </span>
                  {comunidade.em_manutencao && (
                    <span className="badge perigo">Desativada</span>
                  )}
                </button>
              )}
            </div>
          </section>
        )}

        {showForm && (
          <section id="form-postagem" className="post-form-container">
            <h3>{editingPostId ? 'Editar Postagem' : 'Adicionar Postagem'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="post-titulo">Título</label>
                <input
                  id="post-titulo"
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>
              <div className="form-group mt-3">
                <label htmlFor="post-conteudo">Conteúdo</label>
                <textarea
                  id="post-conteudo"
                  required
                  rows="4"
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                ></textarea>
              </div>
              <button type="submit" className="btn-primary mt-3">
                {editingPostId ? 'Salvar Alterações' : 'Publicar'}
              </button>
            </form>
          </section>
        )}

        <div id="lista-posts" data-revelar-cascata>
          {postsFiltrados.length > 0 ? (
            postsFiltrados.map(post => (
              <div className="post-card" key={post.id} data-revelar>
                <div className="post-header">
                  <div>
                    <h4 className="post-title">{post.titulo}</h4>
                    <p className="post-author mb-3">
                      <Link to={`/perfil/${post.autor_nome}`}>@{post.autor_nome}</Link>
                      <span className="post-date text-muted ms-2">• {new Date(post.criado_em).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="post-acoes">
                    {user && user.usuario === post.autor && (
                      <button onClick={() => handleEditClick(post)} className="btn-primary-outline" title="Editar postagem">
                        <i className="fa-solid fa-pen"></i>
                      </button>
                    )}
                    {user && (user.usuario === post.autor || user.is_superuser) && (
                      <button onClick={() => handleExcluir(post.id)} className="btn-danger-outline" title="Remover postagem">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="post-content">
                  {post.conteudo}
                </div>
                <footer className="post-engajamento">
                  <button type="button" onClick={() => handleToggleRespostas(post.id)} aria-expanded={postRespostasAberto === post.id} aria-controls={`respostas-post-${post.id}`}>
                    <i className="fa-solid fa-comments" aria-hidden="true"></i>
                    {post.total_respostas || 0} {(post.total_respostas || 0) === 1 ? 'resposta' : 'respostas'}
                    <i className={`fa-solid fa-chevron-${postRespostasAberto === post.id ? 'up' : 'down'}`} aria-hidden="true"></i>
                  </button>
                </footer>
                {postRespostasAberto === post.id && <section id={`respostas-post-${post.id}`} className="post-respostas" aria-label={`Respostas de ${post.titulo}`}>
                  {carregandoRespostas === post.id && <p className="post-respostas-status" role="status">Carregando respostas...</p>}
                  {carregandoRespostas !== post.id && (respostasPorPost[post.id] || []).length === 0 && <p className="post-respostas-status">Seja a primeira pessoa a responder.</p>}
                  {(respostasPorPost[post.id] || []).map((resposta) => <article key={resposta.id}><header><Link to={`/perfil/${resposta.autor_nome}`}>@{resposta.autor_nome}</Link><time dateTime={resposta.criado_em}>{new Date(resposta.criado_em).toLocaleDateString()}</time></header><p>{resposta.conteudo}</p></article>)}
                  {comunidade.usuario_participa && <form onSubmit={(evento) => handleResponder(evento, post.id)}><label className="sr-only" htmlFor={`nova-resposta-${post.id}`}>Responder à postagem {post.titulo}</label><textarea id={`nova-resposta-${post.id}`} maxLength="1200" rows="3" value={novaResposta} onChange={(evento) => setNovaResposta(evento.target.value)} placeholder="Escreva uma resposta construtiva..." required></textarea><button type="submit" disabled={enviandoResposta || !novaResposta.trim()}>{enviandoResposta ? 'Enviando...' : 'Responder'}</button></form>}
                </section>}
              </div>
            ))
          ) : (
            <div className="empty-state text-center p-5" data-revelar>
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
