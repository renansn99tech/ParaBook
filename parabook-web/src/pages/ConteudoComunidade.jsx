import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import Skeleton from '../components/Skeleton';
import CriadorDesconhecido from '../components/CriadorDesconhecido';
import useRevelacao from '../hooks/useRevelacao';
import api from '../services/api';
import swal, { BOTAO } from '../services/swal';
import '../assets/css/conteudo-comunidade.css';

const toast = (title, icon = 'success') => swal.fire({ toast: true, position: 'top-end', timer: 2600, timerProgressBar: true, showConfirmButton: false, icon, title });

function IdentidadePerfil({ username, clicavel = true, children, className = '' }) {
  if (!clicavel) return <span className={`identidade-perfil identidade-perfil--admin ${className}`.trim()} title="Conta administrativa do ParaBook">{children}</span>;
  return <Link className={className || undefined} to={`/perfil/${username}`}>{children}</Link>;
}

function obterIniciais(nome = '') {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (!palavras.length) return 'PB';
  return `${palavras[0][0]}${palavras.length > 1 ? palavras.at(-1)[0] : ''}`.toLocaleUpperCase('pt-BR');
}

function formatarData(data) {
  return data ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(data)) : 'data indisponível';
}

function formatarMesAno(data) {
  if (!data) return 'Desde o início';
  const texto = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(data));
  return `Desde ${texto}`;
}

function CriadorComunidade({ comunidade }) {
  if (comunidade.criada_por_sistema) return 'Sistema do ParaBook';
  if (!comunidade.criador_nome) return <CriadorDesconhecido />;
  return <IdentidadePerfil username={comunidade.criador_nome} clicavel={comunidade.criador_perfil_clicavel}>@{comunidade.criador_nome}</IdentidadePerfil>;
}

function CarregamentoPagina() {
  return <main className="pagina-comunidade cc-carregamento" aria-busy="true" aria-label="Carregando comunidade">
    <section className="cc-banner cc-skeleton-banner"><Skeleton variant="avatar" width="76px" height="76px" /><div><Skeleton variant="title" width="44%" /><Skeleton width="72%" /><Skeleton width="56%" /></div></section>
    <div className="cc-layout"><section className="cc-feed"><Skeleton variant="title" width="34%" />{[1, 2, 3].map((item) => <div className="cc-post cc-post--skeleton" key={item}><Skeleton variant="avatar" width="48px" height="48px" /><div><Skeleton variant="title" width="55%" /><Skeleton width="92%" /><Skeleton width="78%" /></div></div>)}</section><aside className="cc-aside"><div className="cc-side-card"><Skeleton variant="title" width="48%" /><Skeleton width="88%" /><Skeleton width="70%" /></div></aside></div>
  </main>;
}

function ConteudoComunidade() {
  const { id } = useParams();
  const { user, loading: carregandoUsuario } = useContext(AuthContext);
  const navigate = useNavigate();
  const [comunidade, setComunidade] = useState(null);
  const [postagens, setPostagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('recentes');
  const paginaRef = useRevelacao([comunidade, postagens, busca, ordenacao, loading]);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [postRespostasAberto, setPostRespostasAberto] = useState(null);
  const [respostasPorPost, setRespostasPorPost] = useState({});
  const [carregandoRespostas, setCarregandoRespostas] = useState(null);
  const [rascunhosResposta, setRascunhosResposta] = useState({});
  const [enviandoResposta, setEnviandoResposta] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [alterandoParticipacao, setAlterandoParticipacao] = useState(false);
  const [showMembros, setShowMembros] = useState(false);
  const [membros, setMembros] = useState(null);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [denunciasResumo, setDenunciasResumo] = useState({ carregando: false, denuncias: [] });

  useEffect(() => {
    if (carregandoUsuario) return;
    const fetchDados = async () => {
      try {
        const [comunidadeRes, postagensRes] = await Promise.all([api.get(`/comunidades/comunidades/${id}/`), api.get(`/comunidades/postagens/?comunidade=${id}`)]);
        setComunidade(comunidadeRes.data);
        if (comunidadeRes.data.em_manutencao && !user?.is_superuser) {
          await swal.fire({ icon: 'info', title: 'Comunidade Desativada Temporariamente', text: 'Este espaço foi fechado para ajustes pela equipe do ParaBook. Volte em breve.', confirmButtonText: 'Voltar para Comunidades' });
          navigate('/comunidades');
          return;
        }
        const pData = postagensRes.data.results || postagensRes.data;
        pData.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
        setPostagens(pData);
      } catch (error) { console.error('Erro ao carregar conteúdo da comunidade', error); }
      finally { setLoading(false); }
    };
    fetchDados();
  }, [id, carregandoUsuario, navigate, user?.is_superuser]);

  const admin = Boolean(user?.is_superuser);
  const criador = Boolean(user && !comunidade?.criada_por_sistema && comunidade?.criador === user.usuario);
  const membro = Boolean(comunidade?.usuario_participa);
  const podeConfigurar = admin || criador;
  const papel = admin ? 'Administrador' : criador ? 'Criador' : membro ? 'Membro' : 'Visitante';
  const totalMembros = comunidade?.total_membros || 0;
  const capacidade = comunidade?.max_participantes || 0;
  const ocupacao = capacidade ? Math.min(100, Math.round((totalMembros / capacidade) * 100)) : 0;
  const podePublicar = membro || admin;

  useEffect(() => {
    if (!admin) return undefined;
    let ativo = true;
    setDenunciasResumo((atual) => ({ ...atual, carregando: true }));
    api.get(`/dashboard/denuncias/comunidades/${id}/`)
      .then((resposta) => ativo && setDenunciasResumo({ carregando: false, denuncias: resposta.data.denuncias || [] }))
      .catch((error) => {
        console.error('Erro ao carregar resumo de denúncias da comunidade', error);
        if (ativo) setDenunciasResumo({ carregando: false, denuncias: [] });
      });
    return () => { ativo = false; };
  }, [admin, id]);

  const handleSubmit = async (evento) => {
    evento.preventDefault();
    try {
      if (editingPostId) {
        const res = await api.patch(`/comunidades/postagens/${editingPostId}/`, { titulo, conteudo });
        setPostagens((atuais) => atuais.map((postagem) => postagem.id === editingPostId ? res.data : postagem));
        swal.fire('Sucesso!', 'A postagem foi atualizada.', 'success');
      } else {
        const res = await api.post('/comunidades/postagens/', { comunidade: id, titulo, conteudo });
        setPostagens((atuais) => [res.data, ...atuais]);
        swal.fire('Sucesso!', 'Sua postagem foi criada.', 'success');
      }
      setTitulo(''); setConteudo(''); setEditingPostId(null); setShowForm(false);
    } catch (error) { console.error('Erro ao salvar postagem', error); swal.fire('Erro', 'Ocorreu um erro ao salvar a postagem.', 'error'); }
  };

  const handleEditClick = (postagem) => {
    setTitulo(postagem.titulo); setConteudo(postagem.conteudo); setEditingPostId(postagem.id); setShowForm(true); setShowConfig(false);
    window.requestAnimationFrame(() => { const formulario = document.getElementById('form-postagem'); if (formulario) window.scrollTo({ top: formulario.offsetTop - 100, behavior: 'smooth' }); });
  };
  const handleNovaPostagemClick = () => { setTitulo(''); setConteudo(''); setEditingPostId(null); setShowForm((aberto) => !aberto); setShowConfig(false); };
  const handleConfigClick = () => { setNovoNome(comunidade.nome); setNovaDescricao(comunidade.descricao); setShowConfig((aberto) => !aberto); setShowForm(false); };

  const handleSalvarConfig = async () => {
    setSalvandoConfig(true);
    try {
      const res = await api.patch(`/comunidades/comunidades/${id}/`, { nome: novoNome.trim(), descricao: novaDescricao.trim() });
      setComunidade(res.data); swal.fire({ icon: 'success', title: 'Sucesso!', text: 'Comunidade atualizada.' }); setShowConfig(false);
    } catch (error) {
      console.error('Erro ao atualizar comunidade', error);
      const dados = error.response?.data;
      swal.fire({ icon: 'error', title: 'Erro', text: dados?.detail || Object.values(dados || {}).flat()[0] || 'Ocorreu um erro ao atualizar as configurações.' });
    } finally { setSalvandoConfig(false); }
  };

  const handleToggleMembros = async () => {
    if (!user) { navigate('/login'); return; }
    const abrindo = !showMembros; setShowMembros(abrindo);
    if (abrindo && membros === null) {
      setCarregandoMembros(true);
      try { const res = await api.get(`/comunidades/comunidades/${id}/membros/`); setMembros(res.data); }
      catch (error) { console.error('Erro ao carregar membros', error); swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar a lista de membros.' }); setShowMembros(false); }
      finally { setCarregandoMembros(false); }
    }
  };

  const handleAlternarParticipacao = async () => {
    if (!user) { navigate('/login'); return; }
    if (membro) {
      const confirmacao = await swal.fire({ icon: 'question', title: 'Sair da comunidade?', text: 'Você poderá entrar novamente enquanto houver vagas.', showCancelButton: true, confirmButtonText: 'Sim, sair', cancelButtonText: 'Continuar aqui', confirmButtonColor: BOTAO.neutro });
      if (!confirmacao.isConfirmed) return;
    }
    const participava = membro;
    const totalAnterior = totalMembros;
    setAlterandoParticipacao(true);
    setComunidade((atual) => ({ ...atual, usuario_participa: !participava, total_membros: Math.max(0, totalAnterior + (participava ? -1 : 1)) }));
    try {
      const response = await api.post(`/comunidades/comunidades/${id}/entrar/`);
      const entrou = response.data.status === 'entrou na comunidade';
      setComunidade((atual) => ({ ...atual, usuario_participa: entrou, total_membros: entrou === !participava ? atual.total_membros : Math.max(0, totalAnterior + (entrou ? 1 : -1)) }));
      setMembros(null);
      setShowMembros(false);
      toast(entrou ? `Você entrou em ${comunidade.nome}.` : `Você saiu de ${comunidade.nome}.`);
    } catch (error) {
      console.error('Erro ao alterar participação', error);
      setComunidade((atual) => ({ ...atual, usuario_participa: participava, total_membros: totalAnterior }));
      toast(error.response?.data?.erro || 'Não foi possível concluir agora. Tente de novo.', 'error');
    } finally { setAlterandoParticipacao(false); }
  };

  const handleDesativar = async () => {
    const desativando = !comunidade.em_manutencao;
    const confirmacao = await swal.fire({ icon: 'warning', title: desativando ? 'Desativar comunidade?' : 'Reativar comunidade?', html: desativando ? `<strong>${comunidade.nome}</strong> sairá da lista pública e ficará inacessível. Os membros continuarão vendo-a marcada como desativada.` : `<strong>${comunidade.nome}</strong> voltará a aparecer para todos os leitores.`, showCancelButton: true, confirmButtonText: desativando ? 'Sim, desativar' : 'Sim, reativar', cancelButtonText: 'Cancelar', confirmButtonColor: desativando ? BOTAO.perigo : BOTAO.sucesso });
    if (!confirmacao.isConfirmed) return;
    try { const res = await api.post(`/comunidades/comunidades/${id}/desativar/`); setComunidade((atual) => ({ ...atual, em_manutencao: res.data.em_manutencao })); swal.fire({ icon: 'success', title: res.data.em_manutencao ? 'Comunidade desativada' : 'Comunidade reativada', text: res.data.detail }); }
    catch (error) { console.error('Erro ao desativar comunidade', error); swal.fire({ icon: 'error', title: 'Erro', text: error.response?.data?.detail || 'Não foi possível alterar o status da comunidade.' }); }
  };

  const handleExcluirComunidade = async () => {
    const confirmacao = await swal.fire({ icon: 'warning', title: 'Excluir comunidade?', html: `Todas as postagens de <strong>${comunidade.nome}</strong> serão perdidas. Esta ação não pode ser desfeita.`, showCancelButton: true, confirmButtonText: 'Sim, excluir', cancelButtonText: 'Cancelar', confirmButtonColor: BOTAO.perigo });
    if (!confirmacao.isConfirmed) return;
    try { await api.delete(`/comunidades/comunidades/${id}/`); await swal.fire({ icon: 'success', title: 'Comunidade excluída', text: 'O espaço foi removido da plataforma.' }); navigate('/comunidades'); }
    catch (error) { console.error('Erro ao excluir comunidade', error); swal.fire({ icon: 'error', title: 'Erro', text: error.response?.data?.detail || 'Não foi possível excluir a comunidade.' }); }
  };

  const handleExcluir = async (postId) => {
    const result = await swal.fire({ title: 'Apagar postagem?', text: 'Essa ação não poderá ser desfeita.', icon: 'warning', showCancelButton: true, confirmButtonColor: BOTAO.perigo, cancelButtonColor: BOTAO.neutro, confirmButtonText: 'Sim, excluir', cancelButtonText: 'Cancelar' });
    if (!result.isConfirmed) return;
    try { await api.delete(`/comunidades/postagens/${postId}/`); setPostagens((atuais) => atuais.filter((postagem) => postagem.id !== postId)); swal.fire('Excluído!', 'A postagem foi apagada.', 'success'); }
    catch (error) { console.error('Erro ao excluir', error); swal.fire('Erro', 'Ocorreu um erro ao excluir a postagem.', 'error'); }
  };

  const handleToggleRespostas = async (postId) => {
    if (postRespostasAberto === postId) { setPostRespostasAberto(null); return; }
    setPostRespostasAberto(postId);
    if (respostasPorPost[postId]) return;
    setCarregandoRespostas(postId);
    try { const res = await api.get(`/comunidades/respostas/?postagem=${postId}`); setRespostasPorPost((atual) => ({ ...atual, [postId]: res.data.results || res.data })); }
    catch (error) { console.error('Erro ao carregar respostas', error); swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar as respostas.' }); }
    finally { setCarregandoRespostas(null); }
  };

  const handleResponder = async (evento, postId) => {
    evento.preventDefault();
    const conteudoResposta = (rascunhosResposta[postId] || '').trim();
    if (!conteudoResposta) return;
    setEnviandoResposta(postId);
    try {
      const res = await api.post('/comunidades/respostas/', { postagem: postId, conteudo: conteudoResposta });
      setRespostasPorPost((atual) => ({ ...atual, [postId]: [...(atual[postId] || []), res.data] }));
      setPostagens((atuais) => atuais.map((postagem) => postagem.id === postId ? { ...postagem, total_respostas: (postagem.total_respostas || 0) + 1 } : postagem));
      setRascunhosResposta((atuais) => ({ ...atuais, [postId]: '' }));
    } catch (error) { console.error('Erro ao publicar resposta', error); swal.fire({ icon: 'error', title: 'Erro', text: error.response?.data?.detail || 'Não foi possível publicar sua resposta.' }); }
    finally { setEnviandoResposta(null); }
  };

  const postsFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return postagens.filter((postagem) => !termo || (postagem.titulo || '').toLocaleLowerCase('pt-BR').includes(termo) || (postagem.conteudo || '').toLocaleLowerCase('pt-BR').includes(termo)).sort((a, b) => ordenacao === 'respostas' ? (b.total_respostas || 0) - (a.total_respostas || 0) : new Date(b.criado_em) - new Date(a.criado_em));
  }, [busca, ordenacao, postagens]);

  if (loading || carregandoUsuario) return <CarregamentoPagina />;
  if (!comunidade) return <main className="pagina-comunidade cc-nao-encontrada"><i className="fa-regular fa-compass" aria-hidden="true"></i><h1>Comunidade não encontrada</h1><p>Esse espaço pode ter sido removido ou o endereço está incorreto.</p><Link to="/comunidades" className="btn-primary">Explorar comunidades</Link></main>;
  const membrosVisiveis = showMembros ? (membros?.membros || []) : (membros?.membros || []).slice(0, 3);

  return <main id="topo" className="pagina-comunidade" ref={paginaRef}>
    <nav className="cc-breadcrumb" aria-label="Navegação estrutural" data-revelar><Link to="/comunidades">Comunidades</Link><i className="fa-solid fa-chevron-right" aria-hidden="true"></i><span aria-current="page">{comunidade.nome}</span></nav>
    <section className="cc-banner" data-revelar>
      <span className={`cc-monograma ${comunidade.criada_por_sistema ? 'is-oficial' : ''}`} aria-hidden="true">{obterIniciais(comunidade.nome)}</span>
      <div className="cc-banner-conteudo"><div className="cc-banner-titulo"><h1>{comunidade.nome}</h1>{comunidade.em_manutencao ? <span className="cc-status cc-status--desativada"><i className="fa-solid fa-power-off" aria-hidden="true"></i>Desativada</span> : comunidade.criada_por_sistema ? <span className="cc-status cc-status--oficial"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i>Oficial</span> : null}</div><p>{comunidade.descricao}</p><div className="cc-meta"><span><i className="fa-solid fa-user-group" aria-hidden="true"></i>{totalMembros} {totalMembros === 1 ? 'membro' : 'membros'}</span><span><i className="fa-regular fa-message" aria-hidden="true"></i>{postagens.length} {postagens.length === 1 ? 'postagem' : 'postagens'}</span><span><i className="fa-regular fa-calendar" aria-hidden="true"></i>{formatarMesAno(comunidade.data_criacao)}</span></div></div>
      <div className="cc-banner-acoes">{podePublicar && (!comunidade.em_manutencao || admin) && <button type="button" className="btn-primary cc-novo-post" onClick={handleNovaPostagemClick}><i className={`fa-solid ${showForm ? 'fa-xmark' : 'fa-plus'}`} aria-hidden="true"></i>{showForm ? 'Fechar editor' : 'Nova postagem'}</button>}{podeConfigurar && <button type="button" className="cc-btn-icone" onClick={handleConfigClick} aria-label="Configurações da comunidade" title="Configurações da comunidade"><i className="fa-solid fa-gear" aria-hidden="true"></i></button>}</div>
    </section>
    {comunidade.em_manutencao && <div className="cc-faixa-desativada" role="status"><i className="fa-solid fa-circle-info" aria-hidden="true"></i><span><strong>Comunidade desativada.</strong> {admin ? 'A participação está suspensa, mas a administração ainda pode publicar e moderar.' : 'A publicação e as ações dos posts ficam suspensas até a reativação.'}</span></div>}

    {showConfig && <section className="cc-painel cc-config" aria-labelledby="cc-config-titulo" data-revelar>
      <header><div><span className="cc-eyebrow">Gestão do espaço</span><h2 id="cc-config-titulo">Configurações da comunidade</h2></div><button type="button" className="cc-btn-icone" onClick={() => setShowConfig(false)} aria-label="Fechar configurações"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
      <div className="cc-config-grid"><div className="cc-campo"><label htmlFor="comunidade-nome">Nome da comunidade</label><input id="comunidade-nome" type="text" maxLength={100} value={novoNome} onChange={(evento) => setNovoNome(evento.target.value)} /></div><div className="cc-campo cc-campo--largo"><label htmlFor="comunidade-descricao">Descrição da comunidade</label><textarea id="comunidade-descricao" rows="4" value={novaDescricao} onChange={(evento) => setNovaDescricao(evento.target.value)}></textarea></div></div>
      <div className="cc-config-rodape"><div className="cc-config-identidade"><span className="cc-mini-monograma">{obterIniciais(comunidade.criada_por_sistema ? 'Sistema do ParaBook' : comunidade.criador_nome || 'Desconhecido')}</span><span><small>Criado por</small><CriadorComunidade comunidade={comunidade} /></span></div><button type="button" onClick={handleSalvarConfig} disabled={salvandoConfig || !novoNome.trim() || !novaDescricao.trim()} className="btn-primary">{salvandoConfig ? 'Salvando...' : 'Salvar alterações'}</button></div>
      {(criador || (admin && comunidade.criada_por_sistema)) && <div className="cc-zona-risco"><div><span className="cc-eyebrow">Zona de atenção</span><p>Use estas ações somente quando o espaço precisar sair de circulação.</p></div>{admin && comunidade.criada_por_sistema && <button type="button" onClick={handleDesativar} className="cc-btn-perigo-suave"><i className="fa-solid fa-power-off" aria-hidden="true"></i>{comunidade.em_manutencao ? 'Reativar comunidade' : 'Desativar comunidade'}</button>}{criador && <button type="button" onClick={handleExcluirComunidade} className="cc-btn-perigo-suave"><i className="fa-regular fa-trash-can" aria-hidden="true"></i>Excluir comunidade</button>}</div>}
    </section>}

    {showForm && <section id="form-postagem" className="cc-painel cc-composer" aria-labelledby="cc-composer-titulo" data-revelar><header><div><span className="cc-eyebrow">Conversa da comunidade</span><h2 id="cc-composer-titulo">{editingPostId ? 'Editar postagem' : 'Criar nova postagem'}</h2></div><button type="button" className="cc-btn-icone" onClick={() => setShowForm(false)} aria-label="Fechar editor"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button></header><form onSubmit={handleSubmit}><div className="cc-campo"><label htmlFor="post-titulo">Título</label><input id="post-titulo" type="text" maxLength={200} required value={titulo} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Dê um título claro à conversa" /></div><div className="cc-campo"><label htmlFor="post-conteudo">Conteúdo</label><textarea id="post-conteudo" required rows="6" value={conteudo} onChange={(evento) => setConteudo(evento.target.value)} placeholder="Compartilhe uma ideia, pergunta ou recomendação..."></textarea><small>{conteudo.length} caracteres</small></div><div className="cc-composer-acoes"><button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn-primary"><i className="fa-regular fa-paper-plane" aria-hidden="true"></i>{editingPostId ? 'Salvar alterações' : 'Publicar'}</button></div></form></section>}

    <div className="cc-layout"><section className="cc-feed" aria-labelledby="cc-feed-titulo">
      <header className="cc-feed-toolbar" data-revelar><div><span className="cc-eyebrow">Mural</span><h2 id="cc-feed-titulo">Conversas recentes</h2></div><div className="cc-feed-controles"><label className="cc-busca"><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span className="sr-only">Buscar nas postagens</span><input type="search" placeholder="Buscar conversas" value={busca} onChange={(evento) => setBusca(evento.target.value)} />{busca && <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>}</label><label className="cc-ordenacao"><span className="sr-only">Ordenar postagens</span><select value={ordenacao} onChange={(evento) => setOrdenacao(evento.target.value)}><option value="recentes">Mais recentes</option><option value="respostas">Mais respostas</option></select><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></label></div></header>
      <div id="lista-posts" className="cc-lista-posts" data-revelar-cascata>
        {postsFiltrados.length > 0 ? postsFiltrados.map((post) => <article className="cc-post" key={post.id} data-revelar>
          <header className="cc-post-header"><span className="cc-post-monograma" aria-hidden="true">{obterIniciais(post.autor_nome)}</span><div className="cc-post-identidade"><h3>{post.titulo}</h3><p><IdentidadePerfil username={post.autor_nome} clicavel={post.autor_perfil_clicavel}>@{post.autor_nome}</IdentidadePerfil>{post.autor === comunidade.criador && !comunidade.criada_por_sistema && <span className="cc-badge-criador"><i className="fa-solid fa-crown" aria-hidden="true"></i>Criador</span>}<time dateTime={post.criado_em}>{formatarData(post.criado_em)}</time></p></div>{(!comunidade.em_manutencao || admin) && <div className="cc-post-acoes">{user && user.usuario === post.autor && <button type="button" onClick={() => handleEditClick(post)} aria-label={`Editar ${post.titulo}`} title="Editar postagem"><i className="fa-regular fa-pen-to-square" aria-hidden="true"></i></button>}{user && (user.usuario === post.autor || admin) && <button type="button" onClick={() => handleExcluir(post.id)} className="is-danger" aria-label={`Remover ${post.titulo}`} title="Remover postagem"><i className="fa-regular fa-trash-can" aria-hidden="true"></i></button>}</div>}</header>
          <div className="cc-post-conteudo">{post.conteudo}</div>
          <footer className="cc-post-engajamento"><button type="button" onClick={() => handleToggleRespostas(post.id)} aria-expanded={postRespostasAberto === post.id} aria-controls={`respostas-post-${post.id}`}><i className="fa-regular fa-comments" aria-hidden="true"></i>{post.total_respostas || 0} {(post.total_respostas || 0) === 1 ? 'resposta' : 'respostas'}<i className={`fa-solid fa-chevron-${postRespostasAberto === post.id ? 'up' : 'down'}`} aria-hidden="true"></i></button></footer>
          {postRespostasAberto === post.id && <section id={`respostas-post-${post.id}`} className="cc-respostas" aria-label={`Respostas de ${post.titulo}`}>{carregandoRespostas === post.id && <p className="cc-respostas-status" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>Carregando respostas...</p>}{carregandoRespostas !== post.id && (respostasPorPost[post.id] || []).length === 0 && <p className="cc-respostas-status">Seja a primeira pessoa a responder.</p>}{(respostasPorPost[post.id] || []).map((resposta) => <article key={resposta.id}><span className="cc-resposta-monograma" aria-hidden="true">{obterIniciais(resposta.autor_nome)}</span><div><header><IdentidadePerfil username={resposta.autor_nome} clicavel={resposta.autor_perfil_clicavel}>@{resposta.autor_nome}</IdentidadePerfil><time dateTime={resposta.criado_em}>{formatarData(resposta.criado_em)}</time></header><p>{resposta.conteudo}</p></div></article>)}{podePublicar && (!comunidade.em_manutencao || admin) && <form onSubmit={(evento) => handleResponder(evento, post.id)}><label className="sr-only" htmlFor={`nova-resposta-${post.id}`}>Responder à postagem {post.titulo}</label><textarea id={`nova-resposta-${post.id}`} maxLength="1200" rows="3" value={rascunhosResposta[post.id] || ''} onChange={(evento) => setRascunhosResposta((atuais) => ({ ...atuais, [post.id]: evento.target.value }))} placeholder="Escreva uma resposta construtiva..." required></textarea><button type="submit" disabled={enviandoResposta === post.id || !(rascunhosResposta[post.id] || '').trim()}>{enviandoResposta === post.id ? 'Enviando...' : 'Responder'}</button></form>}</section>}
        </article>) : <div className="cc-feed-vazio" data-revelar><i className={`fa-regular ${busca ? 'fa-face-frown-open' : 'fa-comments'}`} aria-hidden="true"></i><h3>{busca ? 'Nenhuma conversa encontrada' : 'O mural está esperando a primeira conversa'}</h3><p>{busca ? 'Tente buscar por outro termo ou limpe o campo.' : podePublicar ? 'Compartilhe uma pergunta, leitura ou ideia com a comunidade.' : 'Entre na comunidade para iniciar uma conversa.'}</p>{busca ? <button type="button" className="btn-ghost" onClick={() => setBusca('')}>Limpar busca</button> : podePublicar && <button type="button" className="btn-primary" onClick={handleNovaPostagemClick}>Criar postagem</button>}</div>}
      </div>
    </section>

    <aside className="cc-aside" aria-label="Informações da comunidade">
      <section className="cc-side-card" data-revelar><header><span className="cc-side-icone"><i className="fa-solid fa-circle-info" aria-hidden="true"></i></span><h2>Sobre</h2></header><p>{comunidade.descricao}</p><div className="cc-capacidade"><div><span>Ocupação</span><strong>{totalMembros}/{capacidade || '∞'}</strong></div>{capacidade > 0 && <div className="cc-progresso" role="progressbar" aria-label={`Ocupação de ${comunidade.nome}`} aria-valuemin="0" aria-valuemax={capacidade} aria-valuenow={totalMembros}><span style={{ '--cc-ocupacao': `${ocupacao}%` }}></span></div>}</div><dl><div><dt>Criado por</dt><dd><CriadorComunidade comunidade={comunidade} /></dd></div><div><dt>Tipo</dt><dd>{comunidade.criada_por_sistema ? 'Oficial' : 'Da comunidade'}</dd></div><div><dt>Seu papel</dt><dd>{papel}</dd></div></dl>{!admin && !comunidade.em_manutencao && <button type="button" className={membro ? 'btn-ghost cc-participacao' : 'btn-primary cc-participacao'} onClick={handleAlternarParticipacao} disabled={alterandoParticipacao || (!membro && capacidade > 0 && totalMembros >= capacidade)}>{alterandoParticipacao ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>Aguarde...</> : membro ? <><i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>Sair da comunidade</> : capacidade > 0 && totalMembros >= capacidade ? 'Comunidade lotada' : <><i className="fa-solid fa-user-plus" aria-hidden="true"></i>Entrar na comunidade</>}</button>}</section>
      <section className="cc-side-card cc-membros-card" data-revelar><header><span className="cc-side-icone"><i className="fa-solid fa-user-group" aria-hidden="true"></i></span><h2>Membros</h2><span className="cc-side-contador">{membros?.total ?? totalMembros}</span></header>{carregandoMembros && <div className="cc-membros-skeleton" aria-label="Carregando membros"><Skeleton width="76%" /><Skeleton width="62%" /><Skeleton width="70%" /></div>}{!carregandoMembros && membros === null && <p className="cc-side-ajuda">{user ? 'Abra a lista para conhecer quem participa deste espaço.' : 'Entre para conhecer quem participa deste espaço.'}</p>}{!carregandoMembros && membrosVisiveis.length > 0 && <ul>{membrosVisiveis.map((item) => <li key={item.id}><span className="cc-mini-monograma" aria-hidden="true">{obterIniciais(item.nome_exibicao)}</span><span><IdentidadePerfil username={item.username} clicavel={item.perfil_clicavel}>{item.nome_exibicao}</IdentidadePerfil><small>@{item.username}</small></span>{item.e_criador && <i className="fa-solid fa-crown" title="Criador" aria-label="Criador"></i>}</li>)}</ul>}{!carregandoMembros && membros && membros.membros.length === 0 && <p className="cc-side-ajuda">Ainda não há membros nesta comunidade.</p>}<button type="button" className="cc-link-button" onClick={handleToggleMembros} aria-expanded={showMembros}>{showMembros ? 'Mostrar menos' : !user ? 'Entrar para ver membros' : membros === null ? 'Ver membros' : 'Ver lista completa'}<i className={`fa-solid fa-chevron-${showMembros ? 'up' : 'down'}`} aria-hidden="true"></i></button></section>
      {admin && <section className="cc-side-card cc-moderacao-card" data-revelar><header><span className="cc-side-icone"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i></span><h2>Moderação</h2><span className="cc-side-contador">{denunciasResumo.denuncias.length}</span></header>{denunciasResumo.carregando ? <div className="cc-moderacao-skeleton"><Skeleton width="88%" /><Skeleton width="72%" /></div> : denunciasResumo.denuncias.length > 0 ? <ul className="cc-denuncias-resumo">{denunciasResumo.denuncias.slice(0, 3).map((denuncia) => <li key={denuncia.id}><span><i className="fa-solid fa-flag" aria-hidden="true"></i>{denuncia.motivo}</span><small>@{denuncia.denunciante} · {formatarData(denuncia.data)}</small></li>)}</ul> : <p className="cc-moderacao-vazio"><i className="fa-solid fa-shield-circle-check" aria-hidden="true"></i>Nenhuma denúncia pendente</p>}<Link to={`/comunidade/${id}/denuncias`} className="btn-ghost">Abrir painel de denúncias<i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link></section>}
      <section className="cc-side-card cc-diretrizes" data-revelar><header><span className="cc-side-icone"><i className="fa-regular fa-heart" aria-hidden="true"></i></span><h2>Boas conversas</h2></header><ul><li>Respeite diferentes leituras.</li><li>Evite spoilers sem aviso.</li><li>Contribua com contexto e gentileza.</li></ul></section>
    </aside></div>
  </main>;
}

export default ConteudoComunidade;
