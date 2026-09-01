import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import { obterAvatarPerfil } from '../services/avatarPerfil';
import swal from '../services/swal';
import AdminLivros from '../components/admin/AdminLivros';
import AdminComunidades from '../components/admin/AdminComunidades';
import AdminUsuarios from '../components/admin/AdminUsuarios';
import AdminAprovacoes from '../components/admin/AdminAprovacoes';
import AdminDenuncias from '../components/admin/AdminDenuncias';
import AdminLixeira from '../components/admin/AdminLixeira';
import PaletaComandosAdmin from '../components/admin/PaletaComandosAdmin';
import ToastAdmin from '../components/admin/ToastAdmin';
import '../assets/css/admin.css';

const RESUMO_INICIAL = {
  estatisticas: { total_usuarios: 0, total_comunidades: 0, total_livros: 0, denuncias_abertas: 0, comunidades_oficiais: 0 },
  pendencias: { aprovacoes: 0, denuncias: 0, lixeira: 0 },
  turno: { itens: [], ultima_decisao: null },
  atividade: [],
};

const ACOES_AMIGAVEIS = {
  'moderacao.autor.aprovar': 'aprovou uma solicitação de Autor',
  'moderacao.autor.recusar': 'recusou uma solicitação de Autor',
  'moderacao.publicacao.aprovar': 'aprovou uma publicação',
  'moderacao.publicacao.recusar': 'recusou uma publicação',
  'moderacao.livro.aprovar': 'acolheu uma denúncia de livro',
  'moderacao.livro.recusar': 'arquivou uma denúncia de livro',
  'moderacao.comunidade.aprovar': 'acolheu uma denúncia de comunidade',
  'moderacao.comunidade.recusar': 'arquivou uma denúncia de comunidade',
};

const ABAS_DASHBOARD = ['dashboard', 'livros', 'comunidades', 'usuarios', 'aprovacoes', 'denuncias', 'lixeira'];

function useMovimentoReduzido() {
  const [reduzir, setReduzir] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const atualizar = (evento) => setReduzir(evento.matches);
    consulta.addEventListener('change', atualizar);
    return () => consulta.removeEventListener('change', atualizar);
  }, []);
  return reduzir;
}

function useContagem(valor, ativo) {
  const numero = Number.isFinite(Number(valor)) ? Number(valor) : 0;
  const [exibido, setExibido] = useState(ativo ? 0 : numero);
  useEffect(() => {
    if (!ativo) {
      setExibido(numero);
      return undefined;
    }
    const inicio = Date.now();
    const intervalo = window.setInterval(() => {
      const progresso = Math.min(1, (Date.now() - inicio) / 800);
      setExibido(Math.round(numero * (1 - ((1 - progresso) ** 3))));
      if (progresso >= 1) {
        window.clearInterval(intervalo);
        setExibido(numero);
      }
    }, 32);
    return () => window.clearInterval(intervalo);
  }, [ativo, numero]);
  return exibido;
}

function formatarRelativo(data) {
  if (!data) return 'agora';
  const diferenca = Math.max(0, Date.now() - new Date(data).getTime());
  const minutos = Math.floor(diferenca / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}

function estaAtrasado(data) {
  return data && Date.now() - new Date(data).getTime() >= 86400000;
}

function primeiroNome(user) {
  return (user?.nome || user?.username || 'ADM').trim().split(/\s+/)[0];
}

function saudacaoAtual() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function CartaoMetrica({ rotulo, valor, detalhe, icone, tom, onClick, animar }) {
  const exibido = useContagem(valor, animar);
  return (
    <button type="button" className={`card dash-metrica dash-metrica--${tom}`} onClick={onClick}>
      <span className="dash-metrica-topo"><span>{rotulo}</span><i className={`fa-solid ${icone}`} aria-hidden="true"></i></span>
      <strong>{exibido}</strong><small>{detalhe}</small><i className="fa-solid fa-arrow-right dash-metrica-seta" aria-hidden="true"></i>
    </button>
  );
}

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const reduzirMovimento = useMovimentoReduzido();
  const [abaAtiva, setAbaAtiva] = useState(() => {
    const abaSolicitada = new URLSearchParams(location.search).get('aba');
    return ABAS_DASHBOARD.includes(abaSolicitada) ? abaSolicitada : 'dashboard';
  });
  const [resumo, setResumo] = useState(RESUMO_INICIAL);
  const [carregandoResumo, setCarregandoResumo] = useState(true);
  const [erroResumo, setErroResumo] = useState(false);
  const [paletaAberta, setPaletaAberta] = useState(false);
  const [navegacaoCompacta, setNavegacaoCompacta] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 992px)').matches);
  const [menuMovelAberto, setMenuMovelAberto] = useState(false);
  const [processandoTurno, setProcessandoTurno] = useState([]);
  const [toast, setToast] = useState(null);
  const menuMovelRef = useRef(null);
  const gatilhoMenuMovelRef = useRef(null);
  const resumoRequestRef = useRef(0);

  const carregarResumo = useCallback(async () => {
    const requestId = ++resumoRequestRef.current;
    try {
      const resposta = await api.get('/dashboard/estatisticas/');
      if (requestId !== resumoRequestRef.current) return;
      setResumo({ ...RESUMO_INICIAL, ...resposta.data });
      setErroResumo(false);
    } catch (error) {
      if (requestId !== resumoRequestRef.current) return;
      console.error('Erro ao carregar o resumo administrativo', error);
      setErroResumo(true);
    } finally {
      if (requestId === resumoRequestRef.current) setCarregandoResumo(false);
    }
  }, []);

  useEffect(() => { carregarResumo(); }, [carregarResumo]);
  useEffect(() => () => { resumoRequestRef.current += 1; }, []);
  useEffect(() => {
    const abaSolicitada = new URLSearchParams(location.search).get('aba');
    if (ABAS_DASHBOARD.includes(abaSolicitada)) setAbaAtiva(abaSolicitada);
  }, [location.search]);
  useEffect(() => {
    const abrirPaleta = (evento) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLocaleLowerCase() === 'k') {
        evento.preventDefault();
        setPaletaAberta(true);
      }
    };
    document.addEventListener('keydown', abrirPaleta);
    return () => document.removeEventListener('keydown', abrirPaleta);
  }, []);
  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 992px)');
    const atualizar = (evento) => {
      setNavegacaoCompacta(evento.matches);
      if (!evento.matches) setMenuMovelAberto(false);
    };
    consulta.addEventListener('change', atualizar);
    return () => consulta.removeEventListener('change', atualizar);
  }, []);
  useEffect(() => {
    if (!navegacaoCompacta || !menuMovelAberto) return undefined;
    const overflowAnterior = document.body.style.overflow;
    const gatilhoMenu = gatilhoMenuMovelRef.current;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => menuMovelRef.current?.querySelector('.admin-sidebar-fechar')?.focus());
    const fecharComEscape = (evento) => {
      if (evento.key === 'Escape') setMenuMovelAberto(false);
    };
    document.addEventListener('keydown', fecharComEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', fecharComEscape);
      gatilhoMenu?.focus();
    };
  }, [menuMovelAberto, navegacaoCompacta]);

  const notificar = useCallback((mensagem, tipo = 'sucesso') => setToast({ id: Date.now(), mensagem, tipo }), []);
  const menu = [
    { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
    { id: 'livros', icon: 'fa-book', label: 'Livros' },
    { id: 'comunidades', icon: 'fa-users', label: 'Comunidades' },
    { id: 'usuarios', icon: 'fa-user-group', label: 'Usuários' },
    { id: 'aprovacoes', icon: 'fa-clipboard-check', label: 'Aprovações', contador: resumo.pendencias.aprovacoes },
    { id: 'denuncias', icon: 'fa-flag', label: 'Denúncias', warning: true, contador: resumo.pendencias.denuncias },
    { id: 'lixeira', icon: 'fa-trash-can', label: 'Lixeira', danger: true, contador: resumo.pendencias.lixeira },
  ];
  const navegarPara = useCallback((aba) => {
    setAbaAtiva(aba);
    setMenuMovelAberto(false);
  }, []);

  const controlarFocoMenu = (evento) => {
    if (evento.key !== 'Tab' || !navegacaoCompacta || !menuMovelAberto) return;
    const focaveis = [...menuMovelRef.current.querySelectorAll('button:not([disabled]), a[href]')];
    const primeiro = focaveis[0];
    const ultimo = focaveis.at(-1);
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  const resolverTurno = async (item) => {
    const chave = `${item.categoria}-${item.id}`;
    if (processandoTurno.includes(chave)) return;
    setProcessandoTurno((atuais) => [...atuais, chave]);
    setResumo((atual) => ({
      ...atual,
      pendencias: { ...atual.pendencias, [item.fila]: Math.max(0, atual.pendencias[item.fila] - 1) },
      turno: { ...atual.turno, itens: atual.turno.itens.filter((registro) => `${registro.categoria}-${registro.id}` !== chave) },
    }));
    try {
      await api.post(`/dashboard/moderacao/${item.categoria}/${item.id}/`, { acao: item.acao });
      notificar('Decisão registrada e fila atualizada.');
      await carregarResumo();
    } catch (error) {
      setResumo((atual) => {
        if (atual.turno.itens.some((registro) => `${registro.categoria}-${registro.id}` === chave)) return atual;
        return { ...atual, pendencias: { ...atual.pendencias, [item.fila]: atual.pendencias[item.fila] + 1 }, turno: { ...atual.turno, itens: [...atual.turno.itens, item].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em)) } };
      });
      swal.fire({ icon: 'error', title: 'Não foi possível concluir', text: error.response?.data?.detail || 'Atualize a fila e tente novamente.' });
    } finally {
      setProcessandoTurno((atuais) => atuais.filter((registro) => registro !== chave));
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const totalTurno = resumo.pendencias.aprovacoes + resumo.pendencias.denuncias;
  const dataAtual = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const dataCapitalizada = dataAtual.charAt(0).toUpperCase() + dataAtual.slice(1);
  const etapasSetup = [
    { id: 'livros', rotulo: 'Cadastrar o primeiro livro', concluida: resumo.estatisticas.total_livros > 0, icone: 'fa-book-medical' },
    { id: 'usuarios', rotulo: 'Chegar a cinco contas', concluida: resumo.estatisticas.total_usuarios >= 5, icone: 'fa-user-plus' },
    { id: 'comunidades', rotulo: 'Criar uma comunidade oficial', concluida: resumo.estatisticas.comunidades_oficiais > 0, icone: 'fa-users' },
  ];
  const setupConcluido = etapasSetup.filter((etapa) => etapa.concluida).length;
  const exibirSetup = resumo.estatisticas.total_livros === 0 || resumo.estatisticas.total_usuarios < 5;
  const propsFila = useMemo(() => ({ onFilaAlterada: carregarResumo, onNotificar: notificar, onNavegar: navegarPara }), [carregarResumo, navegarPara, notificar]);

  return (
    <div className="admin-container">
      <header className="admin-mobile-header">
        <button ref={gatilhoMenuMovelRef} type="button" className="admin-mobile-menu" aria-expanded={menuMovelAberto} aria-controls="admin-navegacao" onClick={() => setMenuMovelAberto(true)}>
          <i className="fa-solid fa-bars" aria-hidden="true"></i>
          <span><small>Administração</small><strong>{menu.find((item) => item.id === abaAtiva)?.label}</strong></span>
        </button>
        <button type="button" className="admin-mobile-busca" onClick={() => setPaletaAberta(true)} aria-label="Buscar ação administrativa"><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i></button>
      </header>
      <div className={`admin-sidebar-backdrop ${menuMovelAberto ? 'is-open' : ''}`} onMouseDown={(evento) => evento.target === evento.currentTarget && setMenuMovelAberto(false)} aria-hidden="true"></div>
      <aside ref={menuMovelRef} id="admin-navegacao" className={`admin-sidebar ${menuMovelAberto ? 'is-open' : ''}`} aria-label="Navegação administrativa" aria-hidden={navegacaoCompacta && !menuMovelAberto} inert={navegacaoCompacta && !menuMovelAberto} onKeyDown={controlarFocoMenu}>
        <button type="button" className="admin-sidebar-fechar" onClick={() => setMenuMovelAberto(false)} aria-label="Fechar navegação"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
        <div className="brand-logo-admin"><i className="fa-solid fa-book-open-reader" aria-hidden="true"></i><h2>Para<span>Book</span></h2></div>
        <button type="button" className="dash-command-trigger" onClick={() => setPaletaAberta(true)}><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>Buscar ação</span><kbd>⌘K</kbd></button>
        {menu.map((item) => <button key={item.id} type="button" className={`${abaAtiva === item.id ? 'active' : ''} ${item.danger ? 'danger' : ''} ${item.warning ? 'warning' : ''}`} onClick={() => navegarPara(item.id)} aria-current={abaAtiva === item.id ? 'page' : undefined}><i className={`fa-solid ${item.icon}`} aria-hidden="true"></i><span>{item.label}</span>{item.contador > 0 && <span className={`nav-contador nav-contador--${item.id}`}>{item.contador}</span>}</button>)}
        <div className="admin-sidebar-rodape"><Link to={`/perfil/${user?.username}`}><i className="fa-solid fa-user" aria-hidden="true"></i> Meu Perfil</Link><Link to="/"><i className="fa-solid fa-house" aria-hidden="true"></i> Página Inicial</Link><button type="button" className="danger" onClick={handleLogout}><i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Sair</button></div>
      </aside>

      <main className="admin-main">
        {abaAtiva === 'dashboard' && <section className="secao dash-visao">
          <header className="dash-cabecalho"><div><h1>{saudacaoAtual()}, {primeiroNome(user)}</h1><p>{dataCapitalizada} · {totalTurno > 0 ? `${totalTurno} ${totalTurno === 1 ? 'item esperando' : 'itens esperando'} você` : 'nada aguardando decisão'}</p></div><div className="dash-identidade"><span className={`dash-status ${erroResumo ? 'is-error' : ''}`}><i aria-hidden="true"></i>{erroResumo ? 'API indisponível' : 'Operação online'}</span><img src={obterAvatarPerfil(user)} alt="" aria-hidden="true" width="48" height="48" /></div></header>

          <section className={`dash-turno ${totalTurno > 0 ? 'tem-itens' : 'is-empty'}`} aria-labelledby="dash-turno-titulo"><header><div><span><i className={`fa-solid ${totalTurno > 0 ? 'fa-bolt' : 'fa-circle-check'}`} aria-hidden="true"></i></span><div><h2 id="dash-turno-titulo">{totalTurno > 0 ? 'Resolver agora' : 'Fila do turno'}</h2><p>{totalTurno > 0 ? 'Decisões prioritárias reunidas em um único lugar.' : 'A operação está em dia.'}</p></div></div>{carregandoResumo && <i className="fa-solid fa-spinner fa-spin" aria-label="Atualizando resumo"></i>}</header>
            {resumo.turno.itens.length > 0 ? <ul className="dash-turno-lista">{resumo.turno.itens.map((item) => { const chave = `${item.categoria}-${item.id}`; return <li key={chave} className={`dash-turno-item dash-turno-item--${item.fila}`}><span className="dash-turno-icone"><i className={`fa-solid ${item.fila === 'aprovacoes' ? 'fa-feather-pointed' : 'fa-flag'}`} aria-hidden="true"></i></span><span className="dash-turno-texto"><strong>{item.titulo}</strong><small>{item.detalhe}</small></span><span className={`dash-idade ${estaAtrasado(item.criado_em) ? 'is-atrasado' : ''}`} title={item.data_aproximada ? 'Referência: data de criação da conta' : undefined}>{formatarRelativo(item.criado_em)}</span><span className="dash-turno-acoes"><button type="button" className="admin-btn-mini ok" disabled={processandoTurno.includes(chave)} onClick={() => resolverTurno(item)}>{processandoTurno.includes(chave) ? 'Processando...' : item.acao_label}</button><button type="button" className="admin-btn-mini analisar" onClick={() => setAbaAtiva(item.fila)}>Analisar</button></span></li>; })}</ul> : <div className="dash-turno-vazio"><i className="fa-solid fa-check-double" aria-hidden="true"></i><span><strong>Nada esperando por você</strong><small>{resumo.turno.ultima_decisao ? `Última decisão ${formatarRelativo(resumo.turno.ultima_decisao.criado_em)}` : 'A primeira decisão aparecerá aqui.'}</small></span></div>}
          </section>

          <div className="metricas-grid"><CartaoMetrica rotulo="Usuários" valor={resumo.estatisticas.total_usuarios} detalhe="contas cadastradas" icone="fa-user-group" tom="roxo" onClick={() => setAbaAtiva('usuarios')} animar={!reduzirMovimento && !carregandoResumo} /><CartaoMetrica rotulo="Livros" valor={resumo.estatisticas.total_livros} detalhe={resumo.estatisticas.total_livros ? 'itens no acervo' : 'acervo aguardando cadastro'} icone="fa-book" tom="vela" onClick={() => setAbaAtiva('livros')} animar={!reduzirMovimento && !carregandoResumo} /><CartaoMetrica rotulo="Comunidades" valor={resumo.estatisticas.total_comunidades} detalhe="espaços cadastrados" icone="fa-users" tom="roxo" onClick={() => setAbaAtiva('comunidades')} animar={!reduzirMovimento && !carregandoResumo} /><CartaoMetrica rotulo="Alertas" valor={resumo.estatisticas.denuncias_abertas} detalhe={resumo.estatisticas.denuncias_abertas ? 'denúncias abertas' : 'nada aberto'} icone="fa-triangle-exclamation" tom={resumo.estatisticas.denuncias_abertas ? 'warning' : 'success'} onClick={() => setAbaAtiva('denuncias')} animar={!reduzirMovimento && !carregandoResumo} /></div>

          {exibirSetup && <section className="dash-setup" aria-labelledby="dash-setup-titulo"><header><div><span>Primeiros passos</span><h2 id="dash-setup-titulo">Prepare a operação do ParaBook</h2></div><strong>{setupConcluido} de {etapasSetup.length}</strong></header><div className="dash-setup-progresso"><span style={{ '--dash-progresso': `${(setupConcluido / etapasSetup.length) * 100}%` }}></span></div><div className="dash-setup-etapas">{etapasSetup.map((etapa) => <button key={etapa.id} type="button" className={etapa.concluida ? 'is-done' : ''} onClick={() => setAbaAtiva(etapa.id)}><i className={`fa-solid ${etapa.concluida ? 'fa-circle-check' : etapa.icone}`} aria-hidden="true"></i><span>{etapa.rotulo}</span><i className="fa-solid fa-arrow-right" aria-hidden="true"></i></button>)}</div></section>}

          <section className="dash-atividade" aria-labelledby="dash-atividade-titulo"><header><div><span>Auditoria</span><h2 id="dash-atividade-titulo">Aconteceu agora</h2></div><Link to="/perfil/configuracoes/auditoria">Ver auditoria <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link></header>{resumo.atividade.length > 0 ? <ol>{resumo.atividade.map((evento) => <li key={evento.id}><span className={`dash-atividade-icone dash-atividade-icone--${evento.tipo}`}><i className="fa-solid fa-shield-halved" aria-hidden="true"></i></span><span><strong>{evento.ator}</strong> {ACOES_AMIGAVEIS[evento.acao] || evento.acao.replaceAll('.', ' › ')}</span><time dateTime={evento.criado_em}>{formatarRelativo(evento.criado_em)}</time></li>)}</ol> : <div className="dash-estado-vazio"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><span><strong>Nenhuma atividade registrada</strong><small>As próximas decisões administrativas aparecerão aqui.</small></span></div>}</section>
        </section>}

        {abaAtiva === 'livros' && <AdminLivros />}
        {abaAtiva === 'comunidades' && <AdminComunidades />}
        {abaAtiva === 'usuarios' && <AdminUsuarios {...propsFila} />}
        {abaAtiva === 'aprovacoes' && <AdminAprovacoes {...propsFila} />}
        {abaAtiva === 'denuncias' && <AdminDenuncias {...propsFila} />}
        {abaAtiva === 'lixeira' && <AdminLixeira {...propsFila} />}
        <PaletaComandosAdmin aberta={paletaAberta} onClose={() => setPaletaAberta(false)} onNavegar={navegarPara} />
        <ToastAdmin toast={toast} onClose={() => setToast(null)} />
      </main>
    </div>
  );
}

export default Dashboard;
