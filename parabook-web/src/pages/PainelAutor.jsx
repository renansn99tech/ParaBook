import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import AbasPainel from '../components/autor/AbasPainel';
import BloqueioPro from '../components/autor/BloqueioPro';
import GraficoLinha from '../components/autor/GraficoLinha';
import SeletorPeriodo from '../components/autor/SeletorPeriodo';
import Skeleton from '../components/Skeleton';
import ToastAdmin from '../components/admin/ToastAdmin';
import useRevelacao from '../hooks/useRevelacao';
import api from '../services/api';
import { obterAvatarPerfil } from '../services/avatarPerfil';
import { formatarTempoRelativo } from '../services/tempoRelativo';
import '../assets/css/painel-autor.css';

const KPI_CONFIG = [
  { chave: 'leituras', rotulo: 'Leituras', icone: 'fa-book-open', tom: 'purple' },
  { chave: 'leitores_unicos', rotulo: 'Leitores únicos', icone: 'fa-users', tom: 'purple' },
  { chave: 'novos_favoritos', rotulo: 'Novos favoritos', icone: 'fa-heart', tom: 'vela' },
  { chave: 'nota_media', rotulo: 'Nota média', icone: 'fa-star', tom: 'vela' },
];

function numeroFormatado(valor) {
  if (valor === null || valor === undefined) return '—';
  return typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor;
}

function classeDelta(delta) {
  if (!delta || delta === 'estável') return 'is-stable';
  return delta.startsWith('−') ? 'is-down' : 'is-up';
}

function EstadoErro({ onRetry }) {
  return (
    <section className="pautor-estado content-glass-card" role="alert">
      <i className="fa-solid fa-cloud-arrow-down" aria-hidden="true"></i>
      <h2>Não conseguimos carregar seus números agora.</h2>
      <p>Tente novamente. Se o problema continuar, seus dados permanecem seguros e podem ser consultados depois.</p>
      <button type="button" className="btn-primary" onClick={onRetry}>Tentar de novo</button>
    </section>
  );
}

function CarregandoPainel() {
  return (
    <div className="pautor-carregando" role="status" aria-label="Carregando números do painel">
      <div className="pautor-kpis">
        {Array.from({ length: 4 }, (_, indice) => <Skeleton key={indice} height="150px" />)}
      </div>
      <Skeleton height="330px" />
    </div>
  );
}

function PainelAutor() {
  const { user } = useContext(AuthContext);
  const [parametros, setParametros] = useSearchParams();
  const abaParam = parametros.get('aba');
  const abaAtiva = abaParam === 'avancado' ? 'avancado' : 'visao';
  const [periodo, setPeriodo] = useState(30);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [toast, setToast] = useState(null);
  const [exportando, setExportando] = useState(false);
  const paginaRef = useRevelacao([resumo, carregando, abaAtiva]);

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro(false);
    api.get('/biblioteca/autor/analytics/resumo/', {
      params: { periodo },
      signal: controller.signal,
    }).then((resposta) => setResumo(resposta.data))
      .catch((falha) => {
        if (falha.code !== 'ERR_CANCELED' && falha.name !== 'CanceledError') setErro(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [periodo, tentativa]);

  const alterarAba = (aba) => {
    setParametros({ aba }, { replace: true });
  };

  const nomeAutor = user?.nome || user?.username || 'Autor ParaBook';
  const avatar = obterAvatarPerfil(user, user?.foto);
  const totalPublicadas = resumo?.total_publicadas ?? 0;
  const semLeitura = Boolean(resumo && resumo.kpis?.leituras?.valor === 0);
  const obrasOrdenadas = useMemo(() => {
    const peso = { Publicado: 0, 'Em revisão': 1, Rejeitado: 2, Indisponível: 3 };
    return [...(resumo?.obras || [])].sort((a, b) => (peso[a.status] ?? 4) - (peso[b.status] ?? 4));
  }, [resumo]);

  const exportarCsv = async () => {
    setExportando(true);
    try {
      const resposta = await api.get('/biblioteca/autor/analytics/exportar/', {
        params: { periodo },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(resposta.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `painel-autor-${periodo}-dias.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setToast({ tipo: 'sucesso', mensagem: 'Relatório CSV exportado.' });
    } catch {
      setToast({ tipo: 'erro', mensagem: 'Não foi possível exportar o relatório.' });
    } finally {
      setExportando(false);
    }
  };

  return (
    <main className="pautor-page" ref={paginaRef}>
      <div className="pautor-container">
        <nav className="pautor-migalha" aria-label="Migalha de pão" data-revelar>
          <Link to="/perfil">Perfil</Link><i className="fa-solid fa-chevron-right" aria-hidden="true"></i><span aria-current="page">Painel do Autor</span>
        </nav>

        <header className="pautor-hero content-glass-card" data-revelar>
          <div className="pautor-hero-luzes" aria-hidden="true"></div>
          <img src={avatar} alt={`Foto de perfil de ${nomeAutor}`} width="82" height="82" />
          <div className="pautor-hero-texto">
            <p className="pautor-kicker"><i className="fa-solid fa-feather" aria-hidden="true"></i> Painel do Autor</p>
            <h1>Suas obras em números</h1>
            <div className="pautor-meta">
              <span>{nomeAutor} · {totalPublicadas} {totalPublicadas === 1 ? 'obra publicada' : 'obras publicadas'}</span>
              <small className="pautor-chip pautor-chip--plano">Gratuito</small>
              <small className="pautor-chip"><i className="fa-solid fa-lock" aria-hidden="true"></i> Visível só para você</small>
            </div>
          </div>
          <div className="pautor-hero-acoes"><Link to="/minhas-publicacoes" className="btn-outline">Gerenciar publicações</Link>
            <button type="button" className="btn-outline" onClick={exportarCsv} disabled={exportando || !totalPublicadas}>
              <i className="fa-solid fa-file-arrow-down" aria-hidden="true"></i> {exportando ? 'Exportando…' : 'Exportar CSV'}
            </button>
            <Link to="/publicar" className="btn-primary"><i className="fa-solid fa-plus" aria-hidden="true"></i> Publicar novo livro</Link>
          </div>
        </header>

        <div className="pautor-controles" data-revelar>
          <AbasPainel ativa={abaAtiva} onChange={alterarAba} />
          {abaAtiva === 'visao' && <SeletorPeriodo valor={periodo} onChange={setPeriodo} />}
        </div>

        <section id="pautor-painel-visao" role="tabpanel" aria-labelledby="pautor-tab-visao" tabIndex="0" hidden={abaAtiva !== 'visao'}>
          {abaAtiva === 'visao' && (
            carregando ? <CarregandoPainel /> : erro ? <EstadoErro onRetry={() => setTentativa((valor) => valor + 1)} /> : totalPublicadas === 0 ? (
              <section className="pautor-estado content-glass-card" data-revelar>
                <i className="fa-solid fa-book-open-reader" aria-hidden="true"></i>
                <h2>Seu painel abre com a primeira obra publicada.</h2>
                <p>{resumo?.total_obras ? 'Sua obra está no fluxo editorial. Assim que for publicada, os números aparecerão aqui.' : 'Envie sua primeira história para iniciar sua jornada como autor no ParaBook.'}</p>
                <Link to="/publicar" className="btn-primary">Publicar meu primeiro livro</Link>
              </section>
            ) : (
              <div className="pautor-visao">
                {resumo?.historico_parcial && <p className="pautor-nota-dados" role="note"><i className="fa-solid fa-circle-info" aria-hidden="true"></i> Parte do histórico anterior à criação do painel foi reconstruída a partir do último progresso salvo.</p>}
                <div className="pautor-kpis" data-revelar>
                  {KPI_CONFIG.map((config) => {
                    const metrica = resumo.kpis[config.chave];
                    const valor = semLeitura && config.chave !== 'nota_media' ? null : metrica.valor;
                    return <article key={config.chave} className={`pautor-kpi pautor-kpi--${config.tom} glass-card`}><span className="pautor-kpi-icone"><i className={`fa-solid ${config.icone}`} aria-hidden="true"></i></span><p>{config.rotulo}</p><strong>{numeroFormatado(valor)}</strong><small className={classeDelta(metrica.delta)}>{valor === null ? 'Aguardando atividade' : `${metrica.delta} no período`}</small></article>;
                  })}
                </div>

                <div className="pautor-duas-colunas" data-revelar>
                  <section className="pautor-card pautor-card--grafico content-glass-card" aria-labelledby="pautor-grafico-titulo">
                    <header><div><p>ATIVIDADE</p><h2 id="pautor-grafico-titulo">Leituras ao longo do tempo</h2></div><span className={`pautor-tendencia pautor-tendencia--${resumo.tendencia.direcao}`}>{resumo.tendencia.rotulo}</span></header>
                    <GraficoLinha serie={resumo.serie} />
                    {semLeitura && <Link to="/comunidades" className="pautor-link-contexto">Divulgar minhas obras nas comunidades <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link>}
                  </section>

                  <section className="pautor-card content-glass-card" aria-labelledby="pautor-comentarios-titulo">
                    <header><div><p>RECEPÇÃO</p><h2 id="pautor-comentarios-titulo">Últimas resenhas</h2></div></header>
                    {resumo.comentarios.length ? <ul className="pautor-comentarios">{resumo.comentarios.map((comentario) => <li key={comentario.id}><span aria-hidden="true">{comentario.autor.charAt(0).toUpperCase()}</span><div><p>“{comentario.texto}”</p><small>{comentario.autor} · {comentario.obra} · {formatarTempoRelativo(comentario.quando) || 'recentemente'}</small><Link to={`/livro/${comentario.obra_id}`}>Abrir obra</Link></div></li>)}</ul> : <div className="pautor-vazio-compacto"><i className="fa-regular fa-comment-dots" aria-hidden="true"></i><p>Ninguém publicou uma resenha ainda.</p><Link to={`/livro/${resumo.obras.find((obra) => obra.status === 'Publicado')?.id}`}>Abrir minha obra</Link></div>}
                  </section>
                </div>

                <section className="pautor-card pautor-obras content-glass-card" data-revelar aria-labelledby="pautor-obras-titulo">
                  <header><div><p>CATÁLOGO DO AUTOR</p><h2 id="pautor-obras-titulo">Suas obras</h2></div><span>{resumo.total_obras} no fluxo editorial</span></header>
                  <div className="pautor-obras-cabecalho" aria-hidden="true"><span>Obra</span><span>Status</span><span>Leituras</span><span>Favoritos</span><span>Nota</span></div>
                  <div className="pautor-obras-lista">{obrasOrdenadas.map((obra) => <Link to={`/livro/${obra.id}`} key={obra.id} className="pautor-obra"><span className="pautor-obra-identidade"><strong>{obra.titulo}</strong><small>{obra.detalhe}</small></span><span><small>Status</small><b className={`pautor-status pautor-status--${obra.status.toLowerCase().replace(' ', '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{obra.status}</b></span><span><small>Leituras</small>{numeroFormatado(obra.leituras)}</span><span><small>Favoritos</small>{numeroFormatado(obra.favoritos)}</span><span><small>Nota</small>{obra.nota ? <><i className="fa-solid fa-star" aria-hidden="true"></i> {obra.nota}</> : '—'}</span></Link>)}</div>
                </section>

                <section className="pautor-upsell content-glass-card" data-revelar><span><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></span><div><p>PRÓXIMO CAPÍTULO</p><h2>Analytics Pro está sendo preparado</h2><p>Veja uma prévia do que chegará para aprofundar a leitura do desempenho das suas obras.</p></div><button type="button" className="btn-outline" onClick={() => alterarAba('avancado')}>Ver prévia</button></section>
              </div>
            )
          )}
        </section>

        <section id="pautor-painel-avancado" role="tabpanel" aria-labelledby="pautor-tab-avancado" tabIndex="0" hidden={abaAtiva !== 'avancado'}>
          {abaAtiva === 'avancado' && <BloqueioPro />}
        </section>
      </div>
      <ToastAdmin toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}

export default PainelAutor;
