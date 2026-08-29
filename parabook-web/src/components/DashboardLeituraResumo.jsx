import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatarTempoResumo } from '../services/resumoLeitura';
import '../assets/css/home-dashboard.css';

function Metrica({ icone, valor, rotulo, detalhe }) {
  return (
    <article className="hdl-metrica">
      <span><i className={`fa-solid ${icone}`} aria-hidden="true"></i></span>
      <div><strong>{valor}</strong><h3>{rotulo}</h3><p>{detalhe}</p></div>
    </article>
  );
}

function DashboardLeituraResumo({ aberto, onClose, resumo, carregando, erro }) {
  const fecharRef = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const focoAnterior = document.activeElement;
    fecharRef.current?.focus();
    document.body.classList.add('hdl-modal-aberto');
    const fecharComEscape = (evento) => evento.key === 'Escape' && onClose();
    document.addEventListener('keydown', fecharComEscape);
    return () => {
      document.body.classList.remove('hdl-modal-aberto');
      document.removeEventListener('keydown', fecharComEscape);
      focoAnterior?.focus?.();
    };
  }, [aberto, onClose]);

  if (!aberto) return null;
  const metricas = resumo?.metricas || {};
  const generos = resumo?.generos || [];
  const postagens = resumo?.postagens_relevantes || [];
  const maiorGenero = Math.max(...generos.map((genero) => genero.total), 1);

  return (
    <div className="hdl-backdrop" onMouseDown={(evento) => evento.target === evento.currentTarget && onClose()}>
      <section className="hdl-dialog" role="dialog" aria-modal="true" aria-labelledby="hdl-titulo">
        <header className="hdl-header">
          <div><span>Resumo privado</span><h2 id="hdl-titulo">Dashboard de leitura</h2><p>Os sinais da sua jornada literária reunidos em um só lugar.</p></div>
          <button ref={fecharRef} type="button" onClick={onClose} aria-label="Fechar dashboard de leitura"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </header>

        {carregando && <div className="hdl-estado" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>Organizando sua jornada...</p></div>}
        {!carregando && erro && <div className="hdl-estado hdl-estado--erro" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><p>{erro}</p></div>}

        {!carregando && !erro && resumo && <div className="hdl-conteudo">
          <section className="hdl-metricas" aria-label="Métricas da jornada">
            <Metrica icone="fa-hourglass-half" valor={formatarTempoResumo(metricas.tempo_medio_sessao_segundos)} rotulo="Média por sessão" detalhe={`${metricas.sessoes_consideradas || 0} sessões recentes`} />
            <Metrica icone="fa-compass" valor={metricas.generos_explorados || 0} rotulo="Gêneros explorados" detalhe="Categorias presentes na estante" />
            <Metrica icone="fa-star" valor={metricas.avaliacoes_feitas || 0} rotulo="Avaliações feitas" detalhe="Notas ou resenhas publicadas" />
            <Metrica icone="fa-comments" valor={metricas.postagens_relevantes || 0} rotulo="Posts relevantes" detalhe="Com respostas de outras pessoas" />
          </section>

          <div className="hdl-detalhes">
            <section className="hdl-painel" aria-labelledby="hdl-generos">
              <header><span><i className="fa-solid fa-layer-group" aria-hidden="true"></i></span><div><small>Mapa da estante</small><h3 id="hdl-generos">Gêneros explorados</h3></div></header>
              {generos.length > 0 ? <ol className="hdl-generos">{generos.map((genero) => <li key={genero.nome}><div><strong>{genero.nome}</strong><span>{genero.total} {genero.total === 1 ? 'livro' : 'livros'}</span></div><span className="hdl-barra" aria-hidden="true"><i style={{ width: `${Math.round((genero.total / maiorGenero) * 100)}%` }}></i></span></li>)}</ol> : <div className="hdl-vazio"><i className="fa-solid fa-book-open" aria-hidden="true"></i><p>Adicione livros à estante para começar seu mapa de gêneros.</p></div>}
            </section>

            <section className="hdl-painel" aria-labelledby="hdl-postagens">
              <header><span><i className="fa-solid fa-message" aria-hidden="true"></i></span><div><small>Conversas que repercutiram</small><h3 id="hdl-postagens">Postagens relevantes</h3></div></header>
              {postagens.length > 0 ? <ol className="hdl-postagens">{postagens.map((postagem) => <li key={postagem.id}><Link to={postagem.link} onClick={onClose}><span><strong>{postagem.titulo}</strong><small>{postagem.comunidade}</small></span><span className="hdl-respostas"><i className="fa-solid fa-reply" aria-hidden="true"></i>{postagem.respostas}</span></Link></li>)}</ol> : <div className="hdl-vazio"><i className="fa-solid fa-comments" aria-hidden="true"></i><p>Suas postagens aparecerão aqui quando outras pessoas responderem.</p></div>}
            </section>
          </div>

          <footer className="hdl-footer"><p><i className="fa-solid fa-shield-halved" aria-hidden="true"></i> Este resumo é visível apenas para você.</p><Link to="/perfil?tab=historico" onClick={onClose}>Ver histórico completo <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link></footer>
        </div>}
      </section>
    </div>
  );
}

export default DashboardLeituraResumo;
