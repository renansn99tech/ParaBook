import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminAvancadoShell from '../../components/admin/AdminAvancadoShell';
import api from '../../services/api';

const FILTROS = [
  ['tudo', 'Tudo'],
  ['moderacao', 'Moderação'],
  ['conta', 'Conta'],
  ['plataforma', 'Plataforma'],
];

const ACOES_AMIGAVEIS = {
  'moderacao.autor.aprovar': 'aprovou uma solicitação de autor',
  'moderacao.autor.recusar': 'recusou uma solicitação de autor',
  'feature_flag.alterada': 'alterou uma feature flag',
  'django_admin.atalho_aberto': 'abriu o atalho do Django admin',
  'conta.excluida': 'excluiu uma conta',
};

function formatarAcao(acao) {
  return ACOES_AMIGAVEIS[acao] || acao.replaceAll('.', ' › ').replaceAll('_', ' ');
}

function formatarData(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(data));
}

function iniciais(nome) {
  if (!nome || nome === 'Sistema') return 'SI';
  return nome.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
}

function formatarValor(valor) {
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (valor === null || valor === undefined || valor === '') return 'Não informado';
  if (typeof valor === 'object') return JSON.stringify(valor, null, 2);
  return String(valor);
}

function AdminAuditoria() {
  const [searchParams, setSearchParams] = useSearchParams();
  const solicitado = searchParams.get('tipo') || 'tudo';
  const tipo = FILTROS.some(([chave]) => chave === solicitado) ? solicitado : 'tudo';
  const [dados, setDados] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    setAberto(null);
    api.get('/dashboard/auditoria/', {
      params: { formato: 'avancado', ...(tipo !== 'tudo' ? { tipo } : {}) },
    }).then((resposta) => {
      if (!ativo) return;
      setDados(resposta.data);
      setRegistros(resposta.data.resultados);
    }).catch(() => ativo && setErro('Não foi possível carregar os registros de auditoria.'))
      .finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, [tipo]);

  const trocarFiltro = (chave) => {
    setSearchParams(chave === 'tudo' ? {} : { tipo: chave }, { replace: true });
  };

  const carregarMais = async () => {
    if (!dados?.proximo_cursor || carregandoMais) return;
    setCarregandoMais(true);
    try {
      const resposta = await api.get('/dashboard/auditoria/', {
        params: {
          formato: 'avancado',
          cursor: dados.proximo_cursor,
          ...(tipo !== 'tudo' ? { tipo } : {}),
        },
      });
      setRegistros((atuais) => [...atuais, ...resposta.data.resultados]);
      setDados((atual) => ({ ...atual, proximo_cursor: resposta.data.proximo_cursor }));
    } catch {
      setErro('Não foi possível carregar mais registros.');
    } finally {
      setCarregandoMais(false);
    }
  };

  const csvUrl = `${api.defaults.baseURL}/dashboard/auditoria/?formato=csv${tipo !== 'tudo' ? `&tipo=${encodeURIComponent(tipo)}` : ''}`;
  return (
    <AdminAvancadoShell
      titulo="Trilha de auditoria"
      subtitulo="Histórico imutável das decisões administrativas e ações sensíveis registradas pelo ParaBook."
      icone="fa-list-check"
      tom="roxo"
      selo={{ rotulo: 'Eventos hoje', valor: dados?.eventos_hoje ?? '—', tom: 'roxo' }}
    >
      <section className="aa-auditoria-card" aria-labelledby="auditoria-registros">
        <header className="aa-auditoria-filtros">
          <div><span>Governança</span><h2 id="auditoria-registros">Registros da plataforma</h2></div>
          <div className="aa-filtros-scroll" role="group" aria-label="Filtrar registros de auditoria">
            {FILTROS.map(([chave, rotulo]) => (
              <button key={chave} type="button" className={tipo === chave ? 'is-active' : ''} aria-pressed={tipo === chave} onClick={() => trocarFiltro(chave)}>{rotulo}<small>{dados?.contagens?.[chave] ?? 0}</small></button>
            ))}
          </div>
        </header>

        {erro && <div className="aa-auditoria-erro" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>{erro}</div>}
        {carregando ? (
          <div className="aa-estado" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>Organizando a trilha de auditoria...</p></div>
        ) : registros.length === 0 ? (
          <div className="aa-estado aa-estado--vazio"><i className="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i><h3>Nenhum evento neste filtro</h3><p>Não há registros classificados como “{FILTROS.find(([chave]) => chave === tipo)?.[1]}”.</p></div>
        ) : (
          <ol className="aa-timeline">
            {registros.map((registro) => {
              const detalhes = Object.entries(registro.metadados || {});
              const expandido = aberto === registro.id;
              return (
                <li key={registro.id} className={`aa-evento aa-evento--${registro.tipo}`}>
                  <span className="aa-evento-marcador" aria-hidden="true"></span>
                  <article>
                    <button type="button" className="aa-evento-resumo" aria-expanded={expandido} aria-controls={`evento-detalhes-${registro.id}`} onClick={() => setAberto(expandido ? null : registro.id)}>
                      <span className="aa-evento-iniciais" aria-hidden="true">{iniciais(registro.ator)}</span>
                      <span className="aa-evento-texto"><span><strong>{registro.ator}</strong> {formatarAcao(registro.acao)} <strong>{registro.recurso}{registro.recurso_id ? ` #${registro.recurso_id}` : ''}</strong></span><small>{formatarData(registro.criado_em)}</small></span>
                      <span className={`aa-evento-tipo aa-evento-tipo--${registro.tipo}`}>{registro.tipo}</span>
                      <i className={`fa-solid fa-chevron-${expandido ? 'up' : 'down'}`} aria-hidden="true"></i>
                    </button>
                    {expandido && (
                      <div id={`evento-detalhes-${registro.id}`} className="aa-evento-detalhes">
                        {detalhes.length > 0 ? <dl>{detalhes.map(([campo, valor]) => <div key={campo}><dt>{campo.replaceAll('_', ' ')}</dt><dd>{formatarValor(valor)}</dd></div>)}</dl> : <p>Nenhum contexto adicional foi registrado para este evento.</p>}
                        <p className="aa-evento-contexto"><i className={`fa-solid ${registro.sucesso ? 'fa-circle-check' : 'fa-circle-xmark'}`} aria-hidden="true"></i> Operação {registro.sucesso ? 'concluída com sucesso' : 'registrada como falha'}.</p>
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        )}

        <footer className="aa-auditoria-rodape">
          <span><i className="fa-solid fa-shield-halved" aria-hidden="true"></i> Os registros exibidos são somente leitura.</span>
          <div>{dados?.proximo_cursor && <button type="button" className="btn-outline" disabled={carregandoMais} onClick={carregarMais}>{carregandoMais ? 'Carregando...' : 'Carregar mais'}</button>}<a className="btn-outline" href={csvUrl}><i className="fa-solid fa-file-csv" aria-hidden="true"></i> Exportar CSV</a></div>
        </footer>
      </section>
    </AdminAvancadoShell>
  );
}

export default AdminAuditoria;
