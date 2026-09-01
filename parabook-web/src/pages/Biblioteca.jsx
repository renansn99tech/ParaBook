/* oxlint-disable react/only-export-components -- helpers puros exportados para os testes de contrato da Biblioteca */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import Skeleton from '../components/Skeleton';
import useRevelacao from '../hooks/useRevelacao';
import api from '../services/api';
import '../assets/css/biblioteca.css';

const TOTAL_SKELETONS = 8;
const FILTROS_INICIAIS = { origem: 'todas', acesso: 'todos', categoria: 'todas' };
const OPCOES_ORIGEM = [['todas', 'Todas'], ['autor_independente', 'Autores independentes'], ['licenciado', 'Acervo licenciado'], ['dominio_publico', 'Domínio público']];
const OPCOES_ACESSO = [['todos', 'Todos'], ['gratuito', 'Gratuitos'], ['assinante', 'Incluídos no plano'], ['amostra', 'Com amostra']];

export function resolverAcaoLivro(livro) {
  const acesso = livro?.acesso || {};
  if (acesso.pode_ler) return { tipo: 'link', rotulo: 'Ler obra', destino: `/leitura/${livro.id}`, tom: 'primario' };
  if (acesso.codigo === 'requer_autenticacao') return { tipo: 'link', rotulo: 'Entrar para ler', destino: '/login', tom: 'neutro' };
  if (acesso.requer_assinatura) return { tipo: 'link', rotulo: 'Conhecer planos', destino: '/planos', tom: 'plano' };
  if (acesso.pode_ler_amostra) return { tipo: 'link', rotulo: 'Ler amostra', destino: `/leitura/${livro.id}?amostra=1`, tom: 'neutro' };
  if (['vigencia_encerrada', 'licenca_encerrada'].includes(acesso.codigo)) return { tipo: 'inerte', rotulo: 'Período encerrado', tom: 'inerte' };
  return { tipo: 'inerte', rotulo: 'Indisponível', tom: 'inerte', titulo: acesso.mensagem };
}

export function formatarVigencia(disponivelAte, agora = new Date()) {
  if (!disponivelAte) return null;
  const data = new Date(disponivelAte);
  if (Number.isNaN(data.getTime())) return null;
  const dias = Math.ceil((data.getTime() - agora.getTime()) / 86400000);
  if (dias < 0) return { rotulo: 'Período de disponibilidade encerrado', tom: 'encerrada', icone: 'fa-circle-xmark' };
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(data).replace('.', '');
  return { rotulo: `Disponível até ${dataFormatada}`, tom: dias <= 120 ? 'proxima' : 'normal', icone: dias <= 120 ? 'fa-triangle-exclamation' : 'fa-calendar-day' };
}

export function classificarOrigem(livro) {
  if (livro?.origem === 'autor_independente' || livro?.selo_independente === true) return 'autor_independente';
  if (livro?.origem === 'licenciado') return 'licenciado';
  return 'dominio_publico';
}

export function ehDemonstrativo(item) {
  return item?.demonstrativo === true;
}

function normalizar(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function aplicarFiltros(livros, filtros, busca = '', idsColecao = null) {
  const termo = normalizar(busca.trim());
  const ids = idsColecao ? new Set(idsColecao.map(String)) : null;
  return livros.filter((livro) => {
    if (ids && !ids.has(String(livro.id))) return false;
    if (filtros.origem !== 'todas' && classificarOrigem(livro) !== filtros.origem) return false;
    if (filtros.acesso !== 'todos' && livro.modelo_acesso !== filtros.acesso) return false;
    if (filtros.categoria !== 'todas' && String(livro.categoria) !== String(filtros.categoria)) return false;
    if (!termo) return true;
    return [livro.titulo, livro.autor, livro.territorio_cultural].some((campo) => normalizar(campo).includes(termo));
  });
}

export function montarColecoes(colecoes, livros) {
  const porId = new Map(livros.map((livro) => [String(livro.id), livro]));
  return (Array.isArray(colecoes) ? colecoes : []).map((colecao) => {
    try {
      const itens = (Array.isArray(colecao.livros) ? colecao.livros : []).map((id) => porId.get(String(id))).filter(Boolean);
      return { ...colecao, itens, erro: false };
    } catch {
      return { ...colecao, itens: [], erro: true };
    }
  });
}

function CapaLivro({ livro, compacta = false }) {
  if (livro.capa_url) return <img src={livro.capa_url} alt={`Capa de ${livro.titulo}, de ${livro.autor || 'autoria não informada'}`} className={`bib-capa-imagem ${compacta ? 'is-compacta' : ''}`} loading="lazy" decoding="async" width="300" height="450" />;
  return <div className="capa-placeholder" role="img" aria-label={`Sem capa digitalizada: ${livro.titulo}, de ${livro.autor || 'autoria não informada'}`}><span>{livro.categoria_nome || 'Acervo ParaBook'}</span><strong>{livro.titulo}</strong></div>;
}

function SeloOrigem({ livro }) {
  if (livro.selo_independente || livro.origem === 'autor_independente') return <span className="bib-selo bib-selo--independente"><i className="fa-solid fa-feather-pointed" aria-hidden="true"></i>Independente</span>;
  if (livro.origem === 'licenciado') return <span className="bib-selo bib-selo--licenciado"><i className="fa-solid fa-certificate" aria-hidden="true"></i>Licenciado</span>;
  return null;
}

function EstadoAcesso({ livro }) {
  if (livro.modelo_acesso === 'assinante') return <span className="bib-selo bib-selo--plano">Incluído no plano</span>;
  if (livro.modelo_acesso === 'amostra') return <span className="bib-selo bib-selo--amostra">Amostra</span>;
  return null;
}

function AcaoLivro({ livro, admin }) {
  if (admin) return <Link className="bib-acao bib-acao--curadoria" to="/dashboard?aba=livros"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i>Curadoria</Link>;
  if (livro.status && livro.status !== 'publicado') return <span className="bib-acao bib-acao--inerte" title="Esta obra ainda não está publicada.">Situação: {livro.status}</span>;
  const acao = resolverAcaoLivro(livro);
  const secundariaAmostra = acao.rotulo === 'Ler obra' && livro.acesso?.pode_ler_amostra;
  return <div className="bib-acoes-leitura">{acao.tipo === 'link' ? <Link className={`bib-acao bib-acao--${acao.tom}`} to={acao.destino}>{acao.rotulo}</Link> : <span className="bib-acao bib-acao--inerte" title={acao.titulo}>{acao.rotulo}</span>}{secundariaAmostra && <Link className="bib-acao-secundaria" to={`/leitura/${livro.id}?amostra=1`}>Ler amostra</Link>}</div>;
}

function CardLivro({ livro, admin, onDetalhes }) {
  const vigencia = formatarVigencia(livro.disponivel_ate);
  const inerte = resolverAcaoLivro(livro).tipo === 'inerte' || (livro.status && livro.status !== 'publicado');
  const avaliacao = Number(livro.avaliacao);
  return <article className={`bib-card ${inerte ? 'is-inerte' : ''}`} data-revelar><div className="bib-card-capa"><CapaLivro livro={livro} /><div className="bib-card-selos" aria-label="Origem e modelo de acesso da obra"><SeloOrigem livro={livro} /><EstadoAcesso livro={livro} /></div></div><div className="bib-card-corpo"><div className="bib-card-titulo"><span>{livro.categoria_nome || 'Geral'}</span><h3 title={livro.titulo}>{livro.titulo}</h3><p>Por {livro.autor || 'Autoria não informada'}</p></div><div className="bib-card-metadados">{Number.isFinite(avaliacao) && avaliacao > 0 && <span><i className="fa-solid fa-star" aria-hidden="true"></i>{avaliacao.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>}{livro.territorio_cultural && <span><i className="fa-solid fa-location-dot" aria-hidden="true"></i>{livro.territorio_cultural}</span>}{vigencia && <span className={`bib-vigencia bib-vigencia--${vigencia.tom}`}><i className={`fa-solid ${vigencia.icone}`} aria-hidden="true"></i>{vigencia.rotulo}</span>}</div>{livro.modelo_acesso === 'amostra' && <p className="bib-nota-amostra">A amostra não conta leitura, XP nem entra na estante.</p>}<div className="bib-card-rodape"><AcaoLivro livro={livro} admin={admin} /><button type="button" className="bib-detalhes" onClick={(evento) => onDetalhes(livro, evento.currentTarget)} aria-label={`Ver detalhes de ${livro.titulo}`}><i className="fa-solid fa-info" aria-hidden="true"></i></button></div></div></article>;
}

function Dialogo({ aberto, onClose, acionadorRef, tituloId, classe = '', children }) {
  const dialogoRef = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const acionador = acionadorRef?.current;
    const estilosAnteriores = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    window.requestAnimationFrame(() => dialogoRef.current?.querySelector('button, a, [tabindex="0"]')?.focus());
    return () => {
      Object.assign(document.body.style, estilosAnteriores);
      window.scrollTo(0, scrollY);
      acionador?.focus();
    };
  }, [aberto, acionadorRef]);
  if (!aberto) return null;
  const controlarTeclado = (evento) => {
    if (evento.key === 'Escape') { evento.preventDefault(); onClose(); return; }
    if (evento.key !== 'Tab') return;
    const focaveis = [...dialogoRef.current.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')];
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis.at(-1);
    if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus(); }
    if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus(); }
  };
  return <div className="bib-dialogo-fundo" onPointerDown={(evento) => evento.target === evento.currentTarget && onClose()}><section ref={dialogoRef} className={`bib-dialogo ${classe}`} role="dialog" aria-modal="true" aria-labelledby={tituloId} onKeyDown={controlarTeclado}>{children}</section></div>;
}

function DrawerLivro({ livro, onClose, acionadorRef, beta }) {
  const direito = livro ? beta?.direitos?.[livro.id] : null;
  const metricas = livro ? beta?.metricas?.[livro.id] : null;
  return <Dialogo aberto={Boolean(livro)} onClose={onClose} acionadorRef={acionadorRef} tituloId="bib-drawer-titulo" classe="bib-drawer">{livro && <><header className="bib-dialogo-header"><div><span>Ficha da obra</span><h2 id="bib-drawer-titulo">{livro.titulo}</h2></div><button type="button" onClick={onClose} aria-label="Fechar detalhes"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button></header><div className="bib-drawer-resumo"><div className="bib-drawer-capa"><CapaLivro livro={livro} compacta /></div><div><p>Por {livro.autor || 'Autoria não informada'}</p><p>{livro.categoria_nome || 'Geral'}</p>{livro.ano_publicacao && <p>{livro.ano_publicacao}{livro.paginas ? ` · ${livro.paginas} páginas` : ''}</p>}<Link to={`/livro/${livro.id}`}>Abrir ficha completa <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link></div></div><dl className="bib-drawer-dados"><div><dt>Origem editorial</dt><dd>{livro.origem_label || classificarOrigem(livro).replaceAll('_', ' ')}</dd></div><div><dt>Modelo de acesso</dt><dd>{livro.modelo_acesso_label || livro.modelo_acesso}</dd></div>{livro.edicao && <div><dt>Edição</dt><dd>{livro.edicao}</dd></div>}{livro.isbn && <div><dt>ISBN</dt><dd>{livro.isbn}</dd></div>}</dl>{direito && ehDemonstrativo(direito) && <section className="bib-beta-detalhe"><span>Dados demonstrativos · Parceiro fictício</span><h3>Transparência de direitos</h3><dl><div><dt>Titular</dt><dd>{direito.titular}</dd></div><div><dt>Território</dt><dd>{direito.territorio}</dd></div><div><dt>Período</dt><dd>até {direito.disponivel_ate}</dd></div><div><dt>Exclusividade</dt><dd>{direito.exclusividade}</dd></div><div><dt>Formas de acesso</dt><dd>{direito.formas_acesso}</dd></div></dl></section>}{metricas && ehDemonstrativo(metricas) && <section className="bib-beta-detalhe"><span>Métricas demonstrativas</span><h3>Sinais de descoberta</h3><ul><li>{metricas.leitores_mes} leitores neste mês</li><li>{metricas.conclusao_amostra}% concluíram a amostra</li><li>{metricas.apoios} apoios demonstrativos</li></ul></section>}</>}</Dialogo>;
}

function BuscaCatalogo({ busca, onChange }) {
  return <div className="bib-busca"><label htmlFor="bib-busca-catalogo">Buscar no acervo</label><div><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input id="bib-busca-catalogo" type="search" value={busca} onChange={(evento) => onChange(evento.target.value)} placeholder="Busque por título, autor ou território cultural" />{busca && <button type="button" onClick={() => onChange('')} aria-label="Limpar busca"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>}</div></div>;
}

function GrupoFiltro({ titulo, eixo, opcoes, filtros, contagem, onChange }) {
  return <div className="bib-filtro-grupo" role="group" aria-label={titulo}><strong>{titulo}</strong><div className="bib-chips">{opcoes.map(([valor, rotulo]) => <button key={valor} type="button" aria-pressed={filtros[eixo] === valor} onClick={() => onChange(eixo, valor)}>{rotulo}<small>{contagem(eixo, valor)}</small></button>)}</div></div>;
}

function FiltrosCatalogo({ aberto, onAlternar, filtros, categorias, contagem, onChange, onLimpar, temRecorte }) {
  const categoriasOpcoes = [['todas', 'Todas'], ...categorias.map((categoria) => [String(categoria.id), categoria.nome])];
  const ativos = [
    filtros.origem !== 'todas' && { eixo: 'origem', rotulo: OPCOES_ORIGEM.find(([valor]) => valor === filtros.origem)?.[1], padrao: 'todas' },
    filtros.acesso !== 'todos' && { eixo: 'acesso', rotulo: OPCOES_ACESSO.find(([valor]) => valor === filtros.acesso)?.[1], padrao: 'todos' },
    filtros.categoria !== 'todas' && { eixo: 'categoria', rotulo: categoriasOpcoes.find(([valor]) => valor === filtros.categoria)?.[1], padrao: 'todas' },
  ].filter(Boolean);
  return <section className="bib-filtros" aria-label="Filtros do catálogo"><div className="bib-filtros-topo"><button type="button" className="bib-filtros-toggle" aria-expanded={aberto} aria-controls="bib-filtros" onClick={onAlternar}><i className="fa-solid fa-sliders" aria-hidden="true"></i>Filtrar acervo{ativos.length > 0 && <span className="bib-filtros-contador" aria-label={`${ativos.length} filtros ativos`}>{ativos.length}</span>}<i className={`fa-solid ${aberto ? 'fa-chevron-up' : 'fa-chevron-down'}`} aria-hidden="true"></i></button>{temRecorte && <button type="button" className="bib-limpar-filtros" onClick={onLimpar}>Limpar tudo</button>}</div>{ativos.length > 0 && <div className="bib-filtros-ativos" aria-label="Filtros ativos">{ativos.map((filtro) => <button key={filtro.eixo} type="button" onClick={() => onChange(filtro.eixo, filtro.padrao)} aria-label={`Remover filtro ${filtro.rotulo}`}>{filtro.rotulo}<i className="fa-solid fa-xmark" aria-hidden="true"></i></button>)}</div>}<div id="bib-filtros" className={aberto ? 'is-open' : ''} hidden={!aberto}><GrupoFiltro titulo="Origem editorial" eixo="origem" opcoes={OPCOES_ORIGEM} filtros={filtros} contagem={contagem} onChange={onChange} /><GrupoFiltro titulo="Modelo de acesso" eixo="acesso" opcoes={OPCOES_ACESSO} filtros={filtros} contagem={contagem} onChange={onChange} /><GrupoFiltro titulo="Categoria literária" eixo="categoria" opcoes={categoriasOpcoes} filtros={filtros} contagem={contagem} onChange={onChange} /></div></section>;
}

function BibliotecaHero({ user, admin, busca, onBusca, betaAtivo }) {
  return <header className="bib-hero" data-revelar><div className="bib-hero-conteudo"><div className="bib-eyebrow"><span>{admin ? 'Curadoria do acervo' : 'Explorar livros'}</span>{betaAtivo && <span className="bib-beta-pill"><i className="fa-solid fa-flask" aria-hidden="true"></i>Acervo Avançado · Beta</span>}</div><h1>Encontre sua próxima história</h1><p>Descubra autores independentes, vozes locais e regionais, obras licenciadas e clássicos em domínio público.</p><BuscaCatalogo busca={busca} onChange={onBusca} /></div><div className="bib-hero-acao"><span><i className="fa-solid fa-book-open-reader" aria-hidden="true"></i></span>{admin ? <Link to="/dashboard?aba=livros">Abrir curadoria</Link> : user ? <Link to="/minha-biblioteca">Minha Estante</Link> : <Link to="/register">Entrar para começar</Link>}</div></header>;
}

function SecaoCatalogo({ titulo, subtitulo, livros, admin, onDetalhes }) {
  return <section className="bib-secao" data-revelar><header><div><span>{subtitulo}</span><h2>{titulo}</h2></div><small>{livros.length} {livros.length === 1 ? 'obra' : 'obras'}</small></header><div className="bib-grade" data-revelar-cascata>{livros.map((livro) => <CardLivro key={livro.id} livro={livro} admin={admin} onDetalhes={onDetalhes} />)}</div></section>;
}

function CarregamentoPagina() {
  return <main className="pagina-biblioteca" role="status" aria-live="polite"><span className="sr-only">Carregando o acervo da Biblioteca</span><div className="bib-skeleton-hero"><Skeleton variant="title" width="48%" /><Skeleton variant="text" width="70%" /><Skeleton variant="text" width="100%" height="52px" /></div><div className="bib-grade">{Array.from({ length: TOTAL_SKELETONS }).map((_, indice) => <article className="bib-card bib-card--skeleton" key={indice}><div className="bib-card-capa"><Skeleton variant="thumb" width="100%" height="100%" /></div><div className="bib-card-corpo"><Skeleton variant="title" /><Skeleton variant="text" width="60%" /><Skeleton variant="text" height="44px" /></div></article>)}</div></main>;
}

function EstadoCatalogo({ tipo, onTentar, onLimpar, user }) {
  const erro = tipo === 'erro';
  const semResultado = tipo === 'sem-resultado';
  return <section className={`bib-estado bib-estado--${tipo}`} role={erro ? 'alert' : 'status'}><i className={`fa-solid ${erro ? 'fa-cloud-arrow-down' : semResultado ? 'fa-magnifying-glass' : 'fa-book-open'}`} aria-hidden="true"></i><h2>{erro ? 'Não foi possível carregar o acervo' : semResultado ? 'Nenhuma obra neste recorte' : 'O acervo está sendo preparado'}</h2><p>{erro ? 'A conexão com o catálogo falhou. Tente novamente em instantes.' : semResultado ? 'Ajuste a busca ou remova os filtros para encontrar outros títulos.' : 'Novos títulos aparecerão aqui assim que forem publicados.'}</p>{erro && <button type="button" onClick={onTentar}>Tentar novamente</button>}{semResultado && <button type="button" onClick={onLimpar}>Limpar filtros</button>}{tipo === 'vazio' && (user ? <Link to="/publicar">Publicar uma obra</Link> : <Link to="/comunidades">Explorar comunidades</Link>)}</section>;
}

function ModalBeta({ configuracao, onClose, onConfirmar, acionadorRef }) {
  if (!configuracao) return null;
  const compra = configuracao.tipo === 'compra';
  return <Dialogo aberto onClose={onClose} acionadorRef={acionadorRef} tituloId="bib-beta-modal-titulo" classe="bib-beta-modal"><header className="bib-dialogo-header"><div><span>Demonstração Beta</span><h2 id="bib-beta-modal-titulo">{compra ? 'Simular compra da obra' : 'Simular apoio ao autor'}</h2></div><button type="button" onClick={onClose} aria-label="Fechar simulação"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button></header><div className="bib-beta-modal-livro"><div><CapaLivro livro={configuracao.livro} compacta /></div><span><strong>{configuracao.livro.titulo}</strong><small>{configuracao.livro.autor}</small>{compra && <b>{configuracao.oferta.rotulo}</b>}</span></div><p>{compra ? 'Demonstração Beta — nenhuma cobrança será realizada.' : 'Simulação Beta — este apoio não gera movimentação financeira.'}</p><div className="bib-beta-modal-acoes"><button type="button" className="bib-acao bib-acao--neutro" onClick={onClose}>Cancelar</button><button type="button" className="bib-acao bib-acao--primario" onClick={onConfirmar}>{compra ? 'Confirmar simulação' : 'Usar 1 crédito demonstrativo'}</button></div></Dialogo>;
}

function AcervoAvancadoBeta({ livros, onSelecionarColecao, onAbrirDetalhes, onDadosCarregados }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  const [avisoVisivel, setAvisoVisivel] = useState(() => { try { return localStorage.getItem('parabook:aviso-acervo-beta-dispensado') !== '1'; } catch { return true; } });
  const [creditos, setCreditos] = useState(0);
  const [apoiados, setApoiados] = useState([]);
  const [modal, setModal] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const acionadorModalRef = useRef(null);
  const trilhoRef = useRef(null);
  useEffect(() => {
    let ativo = true;
    import('../mocks/mockAcervoBeta').then(({ mockAcervoBeta }) => { if (!ativo || !ehDemonstrativo(mockAcervoBeta)) return; setDados(mockAcervoBeta); setCreditos(mockAcervoBeta.creditos?.disponiveis || 0); onDadosCarregados(mockAcervoBeta); }).catch(() => { if (ativo) { setErro(true); onDadosCarregados(null); } });
    return () => { ativo = false; onDadosCarregados(null); };
  }, [onDadosCarregados]);
  const colecoes = useMemo(() => montarColecoes(dados?.colecoes, livros), [dados, livros]);
  const porId = useMemo(() => new Map(livros.map((livro) => [String(livro.id), livro])), [livros]);
  const ofertas = useMemo(() => dados ? Object.entries(dados.ofertas || {}).flatMap(([id, itens]) => {
    const livro = porId.get(String(id));
    if (!livro) return [];
    return itens.filter((oferta) => ehDemonstrativo(oferta) && (oferta.tipo !== 'apoio' || classificarOrigem(livro) === 'autor_independente')).map((oferta) => ({ livro, oferta }));
  }) : [], [dados, porId]);
  const dispensarAviso = () => { setAvisoVisivel(false); try { localStorage.setItem('parabook:aviso-acervo-beta-dispensado', '1'); } catch { /* armazenamento é opcional */ } };
  const abrirModal = (tipo, livro, oferta, acionador) => { acionadorModalRef.current = acionador; setMensagem(''); setModal({ tipo, livro, oferta }); };
  const confirmar = () => { if (modal.tipo === 'apoio') { if (creditos <= 0 || apoiados.includes(modal.livro.id)) return; setCreditos((valor) => valor - 1); setApoiados((atuais) => [...atuais, modal.livro.id]); setMensagem('Apoio demonstrativo registrado. Nenhuma movimentação financeira foi realizada.'); } else setMensagem('Simulação concluída. Nenhuma cobrança foi realizada.'); setModal(null); };
  if (erro) return <p className="bib-beta-erro" role="status">Experimentos temporariamente indisponíveis.</p>;
  if (!dados) return <p className="bib-beta-carregando" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>Preparando experimentos demonstrativos...</p>;
  return <section className="bib-beta" aria-labelledby="bib-beta-titulo">{avisoVisivel && <section className="bib-beta-aviso" role="region" aria-labelledby="bib-beta-aviso-titulo"><i className="fa-solid fa-circle-info" aria-hidden="true"></i><div><h2 id="bib-beta-aviso-titulo">Uma camada experimental sobre o acervo real</h2><p>Você está experimentando novas formas de descobrir e apoiar autores. Alguns dados e recursos financeiros desta versão são demonstrações.</p></div><button type="button" onClick={dispensarAviso} aria-label="Dispensar aviso da versão Beta"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button></section>}<header className="bib-beta-header"><div><span>Laboratório editorial</span><h2 id="bib-beta-titulo">Acervo Avançado · Beta</h2><p>Coleções e formas de apoio simuladas, sempre separadas do acesso real às obras.</p></div><div className="bib-creditos"><i className="fa-solid fa-hands-holding-circle" aria-hidden="true"></i><span><strong>{creditos} de {dados.creditos.total}</strong> disponíveis neste mês<small>reinicia ao recarregar</small></span></div></header>{mensagem && <p className="bib-beta-sucesso" role="status">{mensagem}</p>}<section className="bib-colecoes" aria-labelledby="bib-colecoes-titulo"><header><div><span>Curadoria experimental</span><h3 id="bib-colecoes-titulo">Coleções editoriais</h3></div><div className="bib-colecoes-setas"><button type="button" onClick={() => trilhoRef.current?.scrollBy({ left: -340, behavior: 'smooth' })} aria-label="Ver coleções anteriores"><i className="fa-solid fa-arrow-left" aria-hidden="true"></i></button><button type="button" onClick={() => trilhoRef.current?.scrollBy({ left: 340, behavior: 'smooth' })} aria-label="Ver próximas coleções"><i className="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div></header><div ref={trilhoRef} className="bib-colecoes-trilho" tabIndex="0" onKeyDown={(evento) => { if (evento.key === 'ArrowLeft') trilhoRef.current?.scrollBy({ left: -340, behavior: 'smooth' }); if (evento.key === 'ArrowRight') trilhoRef.current?.scrollBy({ left: 340, behavior: 'smooth' }); }} aria-label="Coleções editoriais demonstrativas, use as setas do teclado para percorrer">{colecoes.map((colecao) => <article key={colecao.id} className="bib-colecao"><span>Coleção demonstrativa</span><h4>{colecao.titulo}</h4><p>{colecao.descricao}</p><small>{colecao.criterio}</small>{colecao.erro ? <p className="bib-colecao-vazia">Coleção temporariamente indisponível.</p> : colecao.itens.length ? <div className="bib-colecao-capas">{colecao.itens.slice(0, 4).map((livro) => <button key={livro.id} type="button" onClick={(evento) => onAbrirDetalhes(livro, evento.currentTarget)} aria-label={`Ver detalhes de ${livro.titulo}`}><CapaLivro livro={livro} compacta /></button>)}</div> : <p className="bib-colecao-vazia">Nenhuma obra do catálogo corresponde a esta coleção.</p>}<footer><b>{colecao.itens.length} {colecao.itens.length === 1 ? 'obra' : 'obras'}</b><button type="button" onClick={() => onSelecionarColecao(colecao)} disabled={!colecao.itens.length}>Ver coleção</button></footer></article>)}</div></section><section className="bib-ofertas" aria-labelledby="bib-ofertas-titulo"><header><div><span>Protótipo de sustentabilidade</span><h3 id="bib-ofertas-titulo">Ofertas experimentais</h3></div><small>Todos os valores e apoios são demonstrativos</small></header>{ofertas.length ? <div className="bib-ofertas-grade">{ofertas.map(({ livro, oferta }, indice) => <article key={`${livro.id}-${oferta.tipo}-${indice}`}><span>Demonstração Beta</span><h4>{livro.titulo}</h4><p>{oferta.rotulo}</p>{oferta.tipo === 'compra' && oferta.preco ? <button type="button" onClick={(evento) => abrirModal('compra', livro, oferta, evento.currentTarget)}>Simular compra</button> : oferta.tipo === 'apoio' ? <button type="button" disabled={creditos <= 0 || apoiados.includes(livro.id)} onClick={(evento) => abrirModal('apoio', livro, oferta, evento.currentTarget)}>{apoiados.includes(livro.id) ? 'Apoio simulado' : creditos <= 0 ? 'Créditos esgotados' : 'Simular apoio'}</button> : <span className="bib-oferta-informativa">Informação demonstrativa</span>}</article>)}</div> : <p className="bib-colecao-vazia">Nenhuma oferta demonstrativa corresponde às obras carregadas.</p>}</section><ModalBeta configuracao={modal} onClose={() => setModal(null)} onConfirmar={confirmar} acionadorRef={acionadorModalRef} /></section>;
}

function BibliotecaBase({ children, user, admin, busca, setBusca, filtros, setFiltros, filtrosAbertos, setFiltrosAbertos, categorias, contagem, temRecorte, total, livrosFiltrados, secoes, onLimpar, onDetalhes, betaAtivo }) {
  return <><BibliotecaHero user={user} admin={admin} busca={busca} onBusca={setBusca} betaAtivo={betaAtivo} />{admin && <aside className="bib-faixa-curadoria" role="note"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i><div><strong>Visão de curadoria</strong><span>Você também vê fichas não publicadas e licenças encerradas. Nenhuma obra entra na estante por esta tela.</span></div><Link to="/dashboard?aba=livros">Gerenciar acervo</Link></aside>}<FiltrosCatalogo aberto={filtrosAbertos} onAlternar={() => setFiltrosAbertos((valor) => !valor)} filtros={filtros} categorias={categorias} contagem={contagem} onChange={(eixo, valor) => setFiltros((atuais) => ({ ...atuais, [eixo]: valor }))} onLimpar={onLimpar} temRecorte={temRecorte} /><div className="bib-resumo" aria-live="polite"><span><strong>{total}</strong> {total === 1 ? 'obra encontrada' : 'obras encontradas'}</span>{temRecorte && <small>Resultado do recorte atual</small>}</div>{children}{livrosFiltrados.length === 0 ? <EstadoCatalogo tipo="sem-resultado" onLimpar={onLimpar} /> : secoes.map((secao) => <SecaoCatalogo key={secao.id} titulo={secao.titulo} subtitulo={secao.subtitulo} livros={secao.livros} admin={admin} onDetalhes={onDetalhes} />)}</>;
}

function Biblioteca() {
  const { user } = useContext(AuthContext);
  const [livros, setLivros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroCatalogo, setErroCatalogo] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [acervoAvancadoBeta, setAcervoAvancadoBeta] = useState(false);
  const [dadosBeta, setDadosBeta] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [colecaoAtiva, setColecaoAtiva] = useState(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  const [livroDetalhe, setLivroDetalhe] = useState(null);
  const acionadorDetalheRef = useRef(null);
  const admin = user?.tipo === 'admin' && Boolean(user?.is_staff || user?.is_superuser);
  const paginaRef = useRevelacao([livros, categorias, loading, acervoAvancadoBeta, busca, filtros]);
  const interpretarFlag = useCallback((payload) => payload?.acervo_avancado_beta === true, []);
  useEffect(() => {
    const controller = new AbortController();
    const carregarDados = async () => {
      setLoading(true); setErroCatalogo(false);
      try {
        const [livrosRes, categoriasRes, flagsRes] = await Promise.all([api.get('/biblioteca/livros/', { signal: controller.signal }), api.get('/biblioteca/categorias/', { signal: controller.signal }), api.get('/dashboard/feature-flags/publicas/', { signal: controller.signal }).catch(() => ({ data: {} }))]);
        if (controller.signal.aborted) return;
        const livrosData = livrosRes.data.results || livrosRes.data;
        const categoriasData = categoriasRes.data.results || categoriasRes.data;
        setLivros(Array.isArray(livrosData) ? livrosData : []); setCategorias(Array.isArray(categoriasData) ? categoriasData : []); setAcervoAvancadoBeta(interpretarFlag(flagsRes.data));
      } catch (error) { if (controller.signal.aborted) return; console.error('Erro ao buscar dados da biblioteca:', error); setErroCatalogo(true); setAcervoAvancadoBeta(false); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    carregarDados(); return () => controller.abort();
  }, [interpretarFlag, tentativa]);
  useEffect(() => {
    let ativo = true;
    const atualizarFlag = () => api.get('/dashboard/feature-flags/publicas/').then((resposta) => ativo && setAcervoAvancadoBeta(interpretarFlag(resposta.data))).catch(() => ativo && setAcervoAvancadoBeta(false));
    window.addEventListener('parabook:feature-flags-atualizadas', atualizarFlag);
    return () => { ativo = false; window.removeEventListener('parabook:feature-flags-atualizadas', atualizarFlag); };
  }, [interpretarFlag]);
  useEffect(() => { if (!acervoAvancadoBeta) { setDadosBeta(null); setColecaoAtiva(null); } }, [acervoAvancadoBeta]);
  const categoriasComObra = useMemo(() => categorias.filter((categoria) => livros.some((livro) => String(livro.categoria) === String(categoria.id))), [categorias, livros]);
  const livrosFiltrados = useMemo(() => aplicarFiltros(livros, filtros, busca, colecaoAtiva?.livros), [livros, filtros, busca, colecaoAtiva]);
  const temFiltros = filtros.origem !== 'todas' || filtros.acesso !== 'todos' || filtros.categoria !== 'todas';
  const temRecorte = Boolean(busca.trim()) || temFiltros || Boolean(colecaoAtiva);
  const contagem = useCallback((eixo, valor) => aplicarFiltros(livros, { ...filtros, [eixo]: valor }, busca, colecaoAtiva?.livros).length, [livros, filtros, busca, colecaoAtiva]);
  const secoes = useMemo(() => {
    if (temRecorte) return [{ id: 'resultado', titulo: colecaoAtiva?.titulo || 'Resultado da busca', subtitulo: colecaoAtiva ? 'Coleção demonstrativa' : 'Recorte do acervo', livros: livrosFiltrados }];
    const idsCategorizados = new Set(categoriasComObra.map((categoria) => String(categoria.id)));
    const agrupadas = categoriasComObra.map((categoria) => ({ id: categoria.id, titulo: categoria.nome, subtitulo: 'Categoria literária', livros: livros.filter((livro) => String(livro.categoria) === String(categoria.id)) }));
    const semCategoria = livros.filter((livro) => !idsCategorizados.has(String(livro.categoria)));
    if (semCategoria.length) agrupadas.push({ id: 'geral', titulo: 'Geral', subtitulo: 'Categoria literária', livros: semCategoria });
    return agrupadas.sort((a, b) => b.livros.length - a.livros.length);
  }, [temRecorte, colecaoAtiva, livrosFiltrados, categoriasComObra, livros]);
  const limpar = () => { setBusca(''); setFiltros(FILTROS_INICIAIS); setColecaoAtiva(null); };
  const abrirDetalhes = useCallback((livro, acionador) => { acionadorDetalheRef.current = acionador; setLivroDetalhe(livro); }, []);
  const receberDadosBeta = useCallback((dados) => setDadosBeta(dados), []);
  if (loading) return <CarregamentoPagina />;
  if (erroCatalogo) return <main className="pagina-biblioteca"><EstadoCatalogo tipo="erro" onTentar={() => setTentativa((valor) => valor + 1)} /></main>;
  if (livros.length === 0) return <main className="pagina-biblioteca"><BibliotecaHero user={user} admin={admin} busca={busca} onBusca={setBusca} betaAtivo={false} /><EstadoCatalogo tipo="vazio" user={user} /></main>;
  return <main className="pagina-biblioteca" id="topo" ref={paginaRef}><BibliotecaBase user={user} admin={admin} busca={busca} setBusca={setBusca} filtros={filtros} setFiltros={setFiltros} filtrosAbertos={filtrosAbertos} setFiltrosAbertos={setFiltrosAbertos} categorias={categoriasComObra} contagem={contagem} temRecorte={temRecorte} total={livrosFiltrados.length} livrosFiltrados={livrosFiltrados} secoes={secoes} onLimpar={limpar} onDetalhes={abrirDetalhes} betaAtivo={acervoAvancadoBeta}>{acervoAvancadoBeta && <AcervoAvancadoBeta livros={livros} onSelecionarColecao={(colecao) => { setColecaoAtiva({ titulo: colecao.titulo, livros: colecao.itens.map((livro) => livro.id) }); window.requestAnimationFrame(() => document.querySelector('.bib-resumo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} onAbrirDetalhes={abrirDetalhes} onDadosCarregados={receberDadosBeta} />}</BibliotecaBase><DrawerLivro livro={livroDetalhe} onClose={() => setLivroDetalhe(null)} acionadorRef={acionadorDetalheRef} beta={acervoAvancadoBeta ? dadosBeta : null} /></main>;
}

export default Biblioteca;
