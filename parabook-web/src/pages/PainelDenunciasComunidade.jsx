import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import swal, { BOTAO } from '../services/swal';
import '../assets/css/painel-denuncias-comunidade.css';

const DADOS_INICIAIS = {
  comunidade: null,
  resumo: { pendentes: 0, acolhidas: 0, arquivadas: 0, total: 0 },
  denuncias: [],
  historico: [],
};

function formatarData(data) {
  return data ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data)) : 'Data indisponível';
}

function PainelDenunciasComunidade() {
  const { id } = useParams();
  const [dados, setDados] = useState(DADOS_INICIAIS);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [processando, setProcessando] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await api.get(`/dashboard/denuncias/comunidades/${id}/`);
      setDados(resposta.data);
      setErro(false);
    } catch (error) {
      console.error('Erro ao carregar painel de denúncias da comunidade', error);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const decidir = async (denuncia, acao) => {
    const acolher = acao === 'aprovar';
    const confirmacao = await swal.fire({
      icon: 'warning',
      title: acolher ? 'Acolher esta denúncia?' : 'Arquivar como falso positivo?',
      text: acolher
        ? 'A comunidade será desativada e as denúncias pendentes deste espaço serão acolhidas.'
        : 'Somente este registro sairá da fila e será marcado como não procedente.',
      showCancelButton: true,
      confirmButtonText: acolher ? 'Acolher e desativar' : 'Arquivar denúncia',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: acolher ? BOTAO.perigo : BOTAO.padrao,
      cancelButtonColor: BOTAO.neutro,
    });
    if (!confirmacao.isConfirmed) return;

    setProcessando(denuncia.id);
    try {
      await api.post(`/dashboard/moderacao/comunidade/${denuncia.id}/`, { acao });
      await carregar();
      swal.fire({
        toast: true,
        position: 'top-end',
        timer: 2400,
        showConfirmButton: false,
        icon: 'success',
        title: acolher ? 'Denúncia acolhida; comunidade desativada.' : 'Falso positivo arquivado.',
      });
    } catch (error) {
      swal.fire({ icon: 'error', title: 'Decisão não registrada', text: error.response?.data?.detail || 'Atualize o painel e tente novamente.' });
    } finally {
      setProcessando(null);
    }
  };

  if (carregando) return <main className="pdc-pagina" aria-busy="true"><section className="pdc-hero"><Skeleton variant="title" width="42%" /><Skeleton width="66%" /></section><div className="pdc-metricas">{[1, 2, 3, 4].map((item) => <div className="pdc-metrica" key={item}><Skeleton width="48%" /><Skeleton variant="title" width="30%" /></div>)}</div></main>;

  if (erro || !dados.comunidade) return <main className="pdc-pagina pdc-erro"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><h1>Painel indisponível</h1><p>Não foi possível carregar a moderação desta comunidade.</p><button type="button" className="btn-primary" onClick={() => { setCarregando(true); carregar(); }}>Tentar novamente</button></main>;

  const { comunidade, resumo, denuncias, historico } = dados;

  return <main className="pdc-pagina">
    <nav className="pdc-breadcrumb" aria-label="Navegação estrutural"><Link to="/comunidades">Comunidades</Link><i className="fa-solid fa-chevron-right" aria-hidden="true"></i><Link to={`/comunidade/${id}/conteudo`}>{comunidade.nome}</Link><i className="fa-solid fa-chevron-right" aria-hidden="true"></i><span aria-current="page">Denúncias</span></nav>

    <section className="pdc-hero">
      <div><span className="pdc-eyebrow"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i>Moderação da comunidade</span><h1>Painel de denúncias</h1><p>Decisões rápidas sobre <strong>{comunidade.nome}</strong>, com a fila específica deste espaço e seu histórico recente.</p></div>
      <div className="pdc-hero-acoes"><Link to={`/comunidade/${id}/conteudo`} className="btn-ghost"><i className="fa-solid fa-arrow-left" aria-hidden="true"></i>Voltar à comunidade</Link><Link to="/dashboard?aba=denuncias" className="btn-primary">Denúncias recebidas<i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></Link></div>
    </section>

    <section className="pdc-metricas" aria-label="Resumo das denúncias">
      <article className="pdc-metrica pdc-metrica--pendente"><span>Pendentes<i className="fa-regular fa-clock" aria-hidden="true"></i></span><strong>{resumo.pendentes}</strong><small>aguardando decisão</small></article>
      <article className="pdc-metrica pdc-metrica--acolhida"><span>Acolhidas<i className="fa-solid fa-shield" aria-hidden="true"></i></span><strong>{resumo.acolhidas}</strong><small>ações de proteção</small></article>
      <article className="pdc-metrica pdc-metrica--arquivada"><span>Falsos positivos<i className="fa-solid fa-box-archive" aria-hidden="true"></i></span><strong>{resumo.arquivadas}</strong><small>denúncias arquivadas</small></article>
      <article className="pdc-metrica"><span>Total analisado<i className="fa-solid fa-chart-simple" aria-hidden="true"></i></span><strong>{resumo.total}</strong><small>registros históricos</small></article>
    </section>

    <div className="pdc-layout">
      <section className="pdc-fila" aria-labelledby="pdc-fila-titulo"><header><div><span className="pdc-eyebrow">Fila ativa</span><h2 id="pdc-fila-titulo">Denúncias pendentes</h2></div><span className="pdc-contador">{denuncias.length}</span></header>
        {denuncias.length > 0 ? <div className="pdc-lista">{denuncias.map((denuncia) => <article className="pdc-denuncia" key={denuncia.id}><header><span className="pdc-denuncia-icone"><i className="fa-solid fa-flag" aria-hidden="true"></i></span><div><h3>{denuncia.motivo}</h3><p>Enviada por <strong>@{denuncia.denunciante}</strong></p></div><time dateTime={denuncia.data}>{formatarData(denuncia.data)}</time></header><div className="pdc-denuncia-contexto"><span><i className="fa-solid fa-users" aria-hidden="true"></i>{comunidade.total_membros} membros</span><span><i className="fa-regular fa-message" aria-hidden="true"></i>{comunidade.total_postagens} postagens</span><span className={comunidade.em_manutencao ? 'is-paused' : 'is-active'}><i className="fa-solid fa-circle" aria-hidden="true"></i>{comunidade.em_manutencao ? 'Desativada' : 'Ativa'}</span></div><footer><Link to={`/comunidade/${id}/conteudo`} className="btn-outline">Ver contexto</Link><div><button type="button" className="pdc-btn-arquivar" disabled={processando === denuncia.id} onClick={() => decidir(denuncia, 'recusar')}>Arquivar falso positivo</button><button type="button" className="pdc-btn-acolher" disabled={processando === denuncia.id} onClick={() => decidir(denuncia, 'aprovar')}>{processando === denuncia.id ? 'Processando...' : 'Acolher denúncia'}</button></div></footer></article>)}</div> : <div className="pdc-vazio"><i className="fa-solid fa-shield-circle-check" aria-hidden="true"></i><h3>Nenhuma denúncia pendente</h3><p>A fila desta comunidade está em dia.</p><Link to="/dashboard?aba=denuncias" className="btn-ghost">Ver denúncias de toda a plataforma</Link></div>}
      </section>

      <aside className="pdc-lateral"><section className="pdc-card"><header><span><i className="fa-solid fa-users-gear" aria-hidden="true"></i></span><h2>Contexto</h2></header><dl><div><dt>Comunidade</dt><dd>{comunidade.criada_por_sistema ? 'Oficial' : 'Da galera'}</dd></div><div><dt>Status</dt><dd>{comunidade.em_manutencao ? 'Desativada' : 'Ativa'}</dd></div><div><dt>Membros</dt><dd>{comunidade.total_membros}</dd></div><div><dt>Postagens</dt><dd>{comunidade.total_postagens}</dd></div></dl></section>
        <section className="pdc-card"><header><span><i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i></span><h2>Histórico recente</h2></header>{historico.length > 0 ? <ol className="pdc-historico">{historico.map((item) => <li key={item.id}><span className={`is-${item.status}`}><i className={`fa-solid ${item.status === 'acolhida' ? 'fa-shield' : 'fa-box-archive'}`} aria-hidden="true"></i></span><div><strong>{item.motivo}</strong><small>{item.status === 'acolhida' ? 'Acolhida' : 'Falso positivo'} · {formatarData(item.data_analise || item.data)}</small></div></li>)}</ol> : <p className="pdc-card-vazio">As próximas decisões aparecerão aqui.</p>}</section>
      </aside>
    </div>
  </main>;
}

export default PainelDenunciasComunidade;
