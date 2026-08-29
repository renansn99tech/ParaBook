import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import { formatarDataNascimento } from '../services/dadosPessoais';
import { obterAvatarPerfil } from '../services/avatarPerfil';
import { formatarTempoRelativo } from '../services/tempoRelativo';
import swal from '../services/swal';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/perfil.css';

const ABAS_POR_TIPO = {
  leitor: [
    { id: 'info', label: 'Informações', icone: 'fa-circle-info' },
    { id: 'historico', label: 'Histórico', icone: 'fa-clock-rotate-left' },
    { id: 'favoritos', label: 'Favoritos', icone: 'fa-heart' },
    { id: 'comunidades', label: 'Comunidades', icone: 'fa-users' },
  ],
  autor: [
    { id: 'info', label: 'Informações', icone: 'fa-circle-info' },
    { id: 'obras', label: 'Obras', icone: 'fa-book-open' },
    { id: 'historico', label: 'Histórico', icone: 'fa-clock-rotate-left' },
    { id: 'comunidades', label: 'Comunidades', icone: 'fa-users' },
  ],
  admin: [
    { id: 'info', label: 'Informações', icone: 'fa-circle-info' },
    { id: 'comunidades', label: 'Comunidades', icone: 'fa-users' },
  ],
};

const METADADOS_BLOQUEIO = {
  admin: {
    icone: 'fa-shield-halved',
    titulo: 'Acesso negado',
    texto: 'Perfis administrativos só abrem para outras contas de administração.',
  },
  privado: {
    icone: 'fa-user-lock',
    titulo: 'Este perfil é privado',
  },
  nao_encontrado: {
    icone: 'fa-ghost',
    titulo: 'Perfil não encontrado',
  },
};

function BadgeTipo({ tipo }) {
  if (tipo === 'admin') {
    return <span className="badge badge-admin"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i> ADM</span>;
  }
  if (tipo === 'autor') {
    return <span className="badge badge-autor"><i className="fa-solid fa-feather-pointed" aria-hidden="true"></i> Autor</span>;
  }
  return <span className="badge badge-leitor"><i className="fa-solid fa-book-open" aria-hidden="true"></i> Leitor</span>;
}

function EstadoBloqueio({ erro }) {
  const tipo = erro?.statusBlock || 'nao_encontrado';
  const meta = METADADOS_BLOQUEIO[tipo] || METADADOS_BLOQUEIO.nao_encontrado;
  const texto = tipo === 'privado'
    ? `${erro?.nome || 'Esta pessoa'} fechou o perfil. Nada de estatísticas, histórico ou comunidades aparece para visitantes.`
    : (meta.texto || erro?.mensagem || 'Não foi possível abrir este perfil.');

  return (
    <main className="perfil-publico-estado" aria-labelledby="perfil-publico-estado-titulo">
      <span className="perfil-publico-estado-icone"><i className={`fa-solid ${meta.icone}`} aria-hidden="true"></i></span>
      <h1 id="perfil-publico-estado-titulo">{meta.titulo}</h1>
      <p>{texto}</p>
      <Link to="/" className="btn-primary-action"><i className="fa-solid fa-arrow-left" aria-hidden="true"></i> Voltar a explorar</Link>
    </main>
  );
}

function EstadoVazio({ icone, titulo, texto }) {
  return (
    <div className="content-glass-card full-width perfil-vazio">
      <i className={`fa-solid ${icone}`} aria-hidden="true"></i>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
    </div>
  );
}

function CapaLivro({ capa, titulo, className = '' }) {
  return capa
    ? <img className={className} src={capa} alt={`Capa do livro ${titulo}`} loading="lazy" decoding="async" />
    : <span className={`perfil-publico-capa-vazia ${className}`.trim()} aria-label={`O livro ${titulo} não possui capa`}>SEM CAPA</span>;
}

function formatarDataHistorico(data) {
  if (!data) return 'Data não informada';
  const relativa = formatarTempoRelativo(data);
  if (relativa) return relativa;
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR').format(valor);
}

function PerfilPublico() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useContext(AuthContext);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const tabRefs = useRef([]);
  const paginaRef = useRevelacao([dados, searchParams]);

  useEffect(() => {
    if (authLoading) return undefined;

    if (user && user.username === username) {
      navigate('/perfil', { replace: true });
      return undefined;
    }

    const controller = new AbortController();
    const fetchPerfil = async () => {
      setLoading(true);
      setErro(null);
      setDados(null);
      try {
        const res = await api.get(`/perfis/${username}/`, { signal: controller.signal });
        if (res.data.is_owner) {
          navigate('/perfil', { replace: true });
          return;
        }
        setDados(res.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        const resposta = error.response;
        setErro({
          statusBlock: resposta?.status === 403 ? resposta.data?.status_block : 'nao_encontrado',
          mensagem: resposta?.data?.erro || resposta?.data?.detail || 'Perfil não encontrado ou erro no servidor.',
          nome: resposta?.data?.nome,
        });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchPerfil();
    return () => controller.abort();
  }, [authLoading, navigate, user, username]);

  const tipo = dados?.usuario?.tipo || 'leitor';
  const acessoBasico = dados?.acesso?.nivel === 'basico';
  const abas = useMemo(() => (acessoBasico ? [] : (ABAS_POR_TIPO[tipo] || ABAS_POR_TIPO.leitor)), [acessoBasico, tipo]);
  const tabSolicitada = searchParams.get('tab') || 'info';
  const abaAtiva = abas.some((aba) => aba.id === tabSolicitada) ? tabSolicitada : 'info';

  useEffect(() => {
    if (!dados || acessoBasico || tabSolicitada === abaAtiva) return;
    const novosParametros = new URLSearchParams(searchParams);
    novosParametros.set('tab', 'info');
    setSearchParams(novosParametros, { replace: true });
  }, [abaAtiva, acessoBasico, dados, searchParams, setSearchParams, tabSolicitada]);

  const trocarAba = (tab) => {
    const novosParametros = new URLSearchParams(searchParams);
    novosParametros.set('tab', tab);
    setSearchParams(novosParametros);
  };

  const handleTabKeyDown = (evento, indice) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    let proximo = indice;
    if (evento.key === 'ArrowRight') proximo = (indice + 1) % abas.length;
    if (evento.key === 'ArrowLeft') proximo = (indice - 1 + abas.length) % abas.length;
    if (evento.key === 'Home') proximo = 0;
    if (evento.key === 'End') proximo = abas.length - 1;
    trocarAba(abas[proximo].id);
    tabRefs.current[proximo]?.focus();
  };

  const handleCopiarLink = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const campo = document.createElement('textarea');
        campo.value = url;
        campo.setAttribute('readonly', '');
        campo.className = 'sr-only';
        document.body.appendChild(campo);
        campo.select();
        const copiado = document.execCommand('copy');
        campo.remove();
        if (!copiado) throw new Error('Cópia indisponível');
      }
      await swal.fire({ toast: true, position: 'bottom-end', icon: 'success', title: 'Link do perfil copiado', showConfirmButton: false, timer: 2200 });
    } catch {
      await swal.fire({ icon: 'error', title: 'Não foi possível copiar', text: 'Copie o endereço diretamente da barra do navegador.' });
    }
  };

  if (authLoading || loading) {
    return (
      <main className="perfil-publico-carregando" role="status" aria-live="polite">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
        <span>Carregando perfil...</span>
      </main>
    );
  }

  if (erro) return <EstadoBloqueio erro={erro} />;
  if (!dados) return null;

  const perfil = dados.perfil || {};
  const estatisticas = dados.estatisticas || {};
  const favoritos = dados.favoritos || { generos: [], autores: [], livros: [] };
  const interesses = dados.interesses || { generos: [], comunidades: [], recomendacao: null };
  const historico = dados.historico || [];
  const comunidades = dados.comunidades || [];
  const obras = dados.obras || [];
  const pessoais = dados.dados_pessoais || {};
  const primeiroNome = (dados.usuario.nome || dados.usuario.username || 'Esta pessoa').trim().split(/\s+/)[0];
  const comunidadesEmComum = new Set(dados.comunidades_em_comum || []);
  const recomendacao = interesses.recomendacao;
  const metaLeitura = Number(estatisticas.meta_leitura_anual || perfil.meta_leitura_anual || 0);
  const lidosAno = Number(estatisticas.lidos_ano || 0);
  const percentualMeta = metaLeitura > 0 ? Math.min(100, Math.round((lidosAno / metaLeitura) * 100)) : 0;
  const leituraAtual = dados.leitura_em_andamento;
  const progressoAtual = Math.max(0, Math.min(100, Number(leituraAtual?.progresso_percentual || 0)));
  const mediaObras = obras.length > 0
    ? obras.reduce((total, obra) => total + Number(obra.avaliacao || 0), 0) / obras.length
    : null;
  const formatarMedia = (valor) => valor == null ? '—' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const valorPublico = (exibir, valor, vazio = 'Não informado') => exibir === false ? 'Privado' : (valor || vazio);
  const aniversario = pessoais.exibir_data_nascimento === false ? 'Privado' : formatarDataNascimento(pessoais.data_nascimento);

  const statsCards = tipo === 'admin'
    ? [
      { icone: 'fa-book-open', valor: estatisticas.total_lidos || 0, rotulo: 'Livros lidos' },
      { icone: 'fa-users', valor: estatisticas.total_comunidades || 0, rotulo: 'Comunidades' },
    ]
    : tipo === 'autor'
      ? [
        { icone: 'fa-feather-pointed', valor: obras.length, rotulo: 'Obras publicadas' },
        { icone: 'fa-book-open', valor: estatisticas.total_lidos || 0, rotulo: 'Livros lidos' },
        { icone: 'fa-star', valor: formatarMedia(mediaObras), rotulo: 'Nota média das obras' },
        { icone: 'fa-users', valor: estatisticas.total_comunidades || 0, rotulo: 'Comunidades' },
      ]
      : [
        { icone: 'fa-book-open', valor: estatisticas.total_lidos || 0, rotulo: 'Livros lidos', nota: `${lidosAno} neste ano` },
        { icone: 'fa-book-reader', valor: estatisticas.lendo_agora || 0, rotulo: 'Lendo agora' },
        { icone: 'fa-star', valor: estatisticas.total_avaliados || 0, rotulo: 'Avaliados', nota: 'com nota pública' },
        { icone: 'fa-users', valor: estatisticas.total_comunidades || 0, rotulo: 'Comunidades' },
      ];

  const seloCapa = acessoBasico
    ? null
    : tipo === 'autor'
      ? `${obras.length} ${obras.length === 1 ? 'obra publicada' : 'obras publicadas'}`
      : tipo === 'admin'
        ? 'Conta de staff'
        : `${estatisticas.total_lidos || 0} livros concluídos`;

  return (
    <main className={`perfil-page perfil-publico-page ${acessoBasico ? 'is-basic' : `is-${tipo}`}`} ref={paginaRef}>
      <section className="perfil-header-container" data-revelar>
        <div className={`perfil-cover ${perfil.capa ? 'tem-capa-personalizada' : ''}`}>
          {perfil.capa && <img className="perfil-cover-imagem" src={perfil.capa} alt="" aria-hidden="true" />}
          {seloCapa && <span className="perfil-cover-selo">{seloCapa}</span>}
        </div>

        <div className="perfil-content-wrapper">
          <div className="perfil-sidebar">
            <div className="perfil-avatar-box">
              <img src={obterAvatarPerfil(dados.usuario, dados.perfil.foto)} alt={`Foto de perfil de ${dados.usuario.nome || dados.usuario.username}`} className="perfil-avatar" decoding="async" width="176" height="176" />
            </div>
          </div>

          <article className="perfil-main-info glass-card">
            <div className="info-header">
              <h1 className="perfil-nome"><span>{dados.usuario.nome || dados.usuario.username}</span> <BadgeTipo tipo={tipo} /></h1>
              <p className="perfil-username">@{dados.usuario.username}{perfil.descricao_perfil && <> · {perfil.descricao_perfil}</>}</p>
            </div>

            <div className="info-body">
              {perfil.historico_txt && <p className="perfil-descricao"><i className="fa-solid fa-quote-left" aria-hidden="true"></i> {perfil.historico_txt}</p>}
              <div className="perfil-info-divisor" aria-hidden="true"></div>
              <div className="perfil-chips">
                <span className={`perfil-chip ${perfil.localizacao ? '' : 'is-empty'}`}><i className="fa-solid fa-location-dot" aria-hidden="true"></i><small>Local</small><strong>{perfil.localizacao || '—'}</strong></span>
                {!acessoBasico && tipo === 'autor' && <span className={`perfil-chip ${recomendacao ? '' : 'is-empty'}`}><i className="fa-solid fa-bookmark" aria-hidden="true"></i><small>Obra em destaque</small><strong>{recomendacao?.titulo || '—'}</strong></span>}
                {!acessoBasico && tipo === 'admin' && <span className="perfil-chip"><i className="fa-solid fa-key" aria-hidden="true"></i><small>Permissões</small><strong>{dados.usuario.permissoes?.is_superuser ? 'Staff + superuser' : 'Staff'}</strong></span>}
                {!acessoBasico && tipo === 'leitor' && <span className={`perfil-chip ${dados.ultimo_lido?.titulo ? '' : 'is-empty'}`}><i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><small>Último lido</small><strong>{dados.ultimo_lido?.titulo || '—'}</strong></span>}
                {!acessoBasico && tipo !== 'admin' && <span className={`perfil-chip ${favoritos.livros?.length ? '' : 'is-empty'}`}><i className="fa-solid fa-heart" aria-hidden="true"></i><small>Favoritos</small><strong>{favoritos.livros?.length || 0} livros</strong></span>}
              </div>
            </div>

            <div className="perfil-publico-acoes">
              <button type="button" className="btn-primary-action" onClick={handleCopiarLink}><i className="fa-solid fa-link" aria-hidden="true"></i> Copiar link do perfil</button>
            </div>
          </article>

          {!acessoBasico && (
            <aside className="perfil-painel perfil-publico-painel" aria-label={`Resumo público de ${primeiroNome}`}>
              {tipo === 'admin' ? <>
                <span className="perfil-painel-kicker">Administração</span>
                <h2>Conta de staff</h2>
                <p className="perfil-publico-alerta-admin"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i> Só outros admins abrem esta página.</p>
                <dl className="perfil-painel-metricas">
                  <div><dt>Tipo de conta</dt><dd>admin</dd></div>
                  <div><dt>Superusuário</dt><dd>{dados.usuario.permissoes?.is_superuser ? 'sim' : 'não'}</dd></div>
                </dl>
              </> : tipo === 'autor' ? <>
                <span className="perfil-painel-kicker">Destaque autoral</span>
                <h2>Obra em destaque</h2>
                {recomendacao ? <div className="perfil-publico-recomendacao">
                  <CapaLivro capa={recomendacao.capa} titulo={recomendacao.titulo} className="perfil-publico-recomendacao-capa" />
                  <div><small>Recomendação do autor</small><strong>{recomendacao.titulo}</strong><p>{recomendacao.criterio}</p></div>
                  <Link to={`/livro/${recomendacao.id}`} className="btn-primary-action">Ler a obra em destaque</Link>
                </div> : <p className="perfil-ritmo">Nenhuma obra publicada em destaque.</p>}
                <p className="perfil-publico-nota-privada">Leituras, retenção e o futuro repasse ficam no Painel do Autor — ninguém mais vê.</p>
              </> : <>
                <span className="perfil-painel-kicker">Jornada literária</span>
                <h2>Ritmo de leitura</h2>
                {metaLeitura > 0 && <div className="perfil-meta-anual"><span className="perfil-meta-anel" style={{ '--pf-meta': percentualMeta }}><strong>{lidosAno}</strong><small>de {metaLeitura}</small></span><span className="perfil-meta-copy"><small className="perfil-meta-kicker">Meta de leitura {new Date().getFullYear()}</small><strong>{percentualMeta}% concluída</strong><span className={`perfil-meta-status ${percentualMeta >= 100 ? 'concluida' : ''}`}><i className={`fa-solid ${percentualMeta >= 100 ? 'fa-circle-check' : 'fa-book-open'}`} aria-hidden="true"></i>{percentualMeta >= 100 ? 'Meta concluída!' : `Faltam ${Math.max(0, metaLeitura - lidosAno)} livros para a meta do ano.`}</span></span></div>}
                {leituraAtual && <div className="continuar-lendo"><span>Lendo agora</span><strong>{leituraAtual.titulo}</strong><small>{progressoAtual}% concluído</small><div className="perfil-leitura-progresso" role="progressbar" aria-label={`Progresso de ${leituraAtual.titulo}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressoAtual}><span style={{ width: `${progressoAtual}%` }} /></div><Link to={`/livro/${leituraAtual.id}`} className="btn-outline">Ver este livro</Link></div>}
                {recomendacao && <div className="perfil-publico-recomendacao perfil-publico-recomendacao--leitor"><CapaLivro capa={recomendacao.capa} titulo={recomendacao.titulo} className="perfil-publico-recomendacao-capa" /><div><small>Recomendação do leitor</small><strong>{recomendacao.titulo}</strong><p>{recomendacao.criterio}</p></div><Link to={`/livro/${recomendacao.id}`} className="btn-primary-action">Ver o livro</Link></div>}
              </>}
            </aside>
          )}
        </div>
      </section>

      {acessoBasico ? (
        <section className="perfil-publico-basico content-glass-card" data-revelar aria-labelledby="perfil-publico-sobre-basico">
          <div><span className="perfil-publico-basico-icone"><i className="fa-solid fa-address-card" aria-hidden="true"></i></span><div><h2 id="perfil-publico-sobre-basico">Sobre {primeiroNome}</h2><p>{perfil.bio || 'Nenhuma biografia cadastrada.'}</p></div></div>
          <aside><i className="fa-solid fa-lock" aria-hidden="true"></i><p>Entre para ver a jornada literária, os favoritos e as comunidades deste perfil.</p><Link to="/login" className="btn-primary-action">Entrar no ParaBook</Link></aside>
        </section>
      ) : <>
        <section className="perfil-stats-grid perfil-publico-stats" style={{ '--pf-stats': statsCards.length }} data-revelar-cascata aria-label="Estatísticas públicas do perfil">
          {statsCards.map((card) => <div key={card.rotulo} className="stat-glass-card" data-revelar><span className="stat-icon"><i className={`fa-solid ${card.icone}`} aria-hidden="true"></i></span><span className="stat-info"><strong className="stat-number">{card.valor}</strong><span className="stat-label">{card.rotulo}</span>{card.nota && <small className="perfil-publico-stat-nota">{card.nota}</small>}</span></div>)}
        </section>

        <section className="perfil-tabs-section perfil-publico-tabs" data-revelar>
          <div className="tabs-nav" role="tablist" aria-label="Seções do perfil público">
            {abas.map((aba, indice) => <button key={aba.id} ref={(elemento) => { tabRefs.current[indice] = elemento; }} type="button" id={`tab-publico-${aba.id}`} className={`tab-btn ${abaAtiva === aba.id ? 'active' : ''}`} role="tab" aria-selected={abaAtiva === aba.id} aria-controls={`painel-publico-${aba.id}`} tabIndex={abaAtiva === aba.id ? 0 : -1} onClick={() => trocarAba(aba.id)} onKeyDown={(evento) => handleTabKeyDown(evento, indice)}><span><i className={`fa-solid ${aba.icone}`} aria-hidden="true"></i> {aba.label}</span>{aba.id === 'obras' && <span className="tab-contador">{obras.length}</span>}</button>)}
          </div>

          <div className="tab-content active" id={`painel-publico-${abaAtiva}`} role="tabpanel" aria-labelledby={`tab-publico-${abaAtiva}`}>
            {abaAtiva === 'info' && <div className="perfil-info-grid perfil-info-grid--moderno perfil-publico-info">
              <article className="content-glass-card">
                <h2>Sobre {primeiroNome}</h2>
                <p className="sobre-texto">{perfil.bio || 'Nenhuma biografia cadastrada.'}</p>
                {favoritos.generos?.length > 0 && <div className="perfil-publico-generos" aria-label="Gêneros favoritos">{favoritos.generos.map((genero) => <span key={genero} className="genre-tag">{genero}</span>)}</div>}
                <div className="perfil-sobre-divisor" aria-hidden="true"></div>
                <div className="perfil-dados-pessoais perfil-dados-pessoais--publico"><dl>
                  <div><dt><i className="fa-solid fa-cake-candles" aria-hidden="true"></i> Idade</dt><dd className={pessoais.exibir_idade === false ? 'is-private' : ''}>{valorPublico(pessoais.exibir_idade, Number.isInteger(pessoais.idade) ? `${pessoais.idade} anos` : null)}</dd></div>
                  <div><dt><i className="fa-solid fa-calendar-day" aria-hidden="true"></i> Aniversário</dt><dd className={pessoais.exibir_data_nascimento === false ? 'is-private' : ''}>{aniversario}</dd></div>
                  <div><dt><i className="fa-solid fa-envelope" aria-hidden="true"></i> E-mail</dt><dd className={pessoais.exibir_email === false ? 'is-private' : ''}>{valorPublico(pessoais.exibir_email, pessoais.email)}</dd></div>
                </dl></div>
              </article>

              <article className="content-glass-card perfil-publico-afinidades">
                <h2>O que {primeiroNome} mais lê</h2>
                {interesses.generos?.length > 0 && <div className="perfil-publico-barras">{interesses.generos.map((genero) => { const maximo = Math.max(...interesses.generos.map((item) => item.total), 1); const percentual = Math.round((genero.total / maximo) * 100); return <div key={genero.nome}><span><strong>{genero.nome}</strong><small>{genero.total} {genero.total === 1 ? 'livro' : 'livros'}</small></span><div aria-hidden="true"><span style={{ width: `${percentual}%` }}></span></div></div>; })}</div>}
                <footer><span>Autores mais presentes na estante</span><p>{favoritos.autores?.length ? favoritos.autores.join(' · ') : 'Nenhum autor em destaque ainda.'}</p><small>Só aparece o que {primeiroNome} deixou público.</small></footer>
              </article>
            </div>}

            {abaAtiva === 'historico' && (historico.length > 0 ? <div className="perfil-publico-historico">{historico.map((item) => <Link to={`/livro/${item.livro_id}`} key={item.id} className="content-glass-card perfil-publico-historico-card"><CapaLivro capa={item.capa} titulo={item.titulo} className="perfil-publico-historico-capa" /><span><strong>{item.titulo}</strong><small>{item.autor}</small>{item.nota != null && <b><i className="fa-solid fa-star" aria-hidden="true"></i> {Number(item.nota).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</b>}</span><time dateTime={item.data || undefined}>{formatarDataHistorico(item.data)}</time></Link>)}</div> : <EstadoVazio icone="fa-ghost" titulo="Nenhum livro concluído ainda" />)}

            {abaAtiva === 'obras' && (obras.length > 0 ? <div className="perfil-publico-obras">{obras.map((obra) => <article key={obra.id} className="content-glass-card perfil-publico-obra-card"><CapaLivro capa={obra.capa} titulo={obra.titulo} className="perfil-publico-obra-capa" /><div><span className="genre-tag">{obra.categoria}</span><h3>{obra.titulo}</h3><p>{obra.paginas ? `${obra.paginas} páginas` : 'Quantidade de páginas não informada'}</p><strong><i className="fa-solid fa-star" aria-hidden="true"></i> {formatarMedia(Number(obra.avaliacao || 0))}</strong><Link to={`/livro/${obra.id}`} className="btn-outline">Ler</Link></div></article>)}</div> : <EstadoVazio icone="fa-book" titulo="Nenhuma obra publicada" texto="As obras aprovadas aparecerão aqui." />)}

            {abaAtiva === 'favoritos' && (favoritos.livros?.length > 0 ? <div className="favoritos-grid full perfil-publico-favoritos">{favoritos.livros.map((livro) => <article key={livro.id} className="favorito-card content-glass-card"><div className="favorito-capa"><CapaLivro capa={livro.capa} titulo={livro.titulo} /><i className="fa-solid fa-heart perfil-publico-coracao" aria-hidden="true"></i></div><div className="favorito-info"><h3>{livro.titulo}</h3><p>{livro.autor}</p></div></article>)}</div> : <EstadoVazio icone="fa-heart-crack" titulo="Nenhum livro favorito" texto="Este perfil ainda não tornou nenhum favorito visível." />)}

            {abaAtiva === 'comunidades' && (comunidades.length > 0 ? <div className="comunidades-perfil-grid perfil-publico-comunidades">{comunidades.map((comunidade) => { const comum = comunidadesEmComum.has(comunidade.id); const descricao = comunidade.descricao || ''; return <article key={comunidade.id} className="comunidade-perfil-card content-glass-card"><header><span className="comunidade-perfil-icone"><i className="fa-solid fa-users" aria-hidden="true"></i></span><div><h3>{comunidade.nome}</h3><small className={comum ? 'is-common' : ''}>{comum ? 'Vocês dois participam' : 'Aberta para entrar'}</small></div></header><p>{descricao.length > 120 ? `${descricao.slice(0, 120)}…` : descricao}</p><footer><span>Comunidade literária</span><Link to={`/comunidade/${comunidade.id}/conteudo`}>Acessar <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link></footer></article>; })}</div> : <EstadoVazio icone="fa-users-slash" titulo="Nenhuma comunidade pública" texto="Este perfil ainda não participa de comunidades disponíveis." />)}
          </div>
        </section>

        {tipo === 'admin' && <aside className="perfil-publico-rodape-admin" data-revelar><i className="fa-solid fa-shield-halved" aria-hidden="true"></i><p><strong>Perfil de administração:</strong> leitores e autores que abrirem esta URL recebem 403 — o backend nem monta os dados.</p></aside>}
      </>}
    </main>
  );
}

export default PerfilPublico;
