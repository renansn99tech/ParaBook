import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../context/auth-context';
import AdminAvancadoShell from '../../components/admin/AdminAvancadoShell';
import SwitchAdmin from '../../components/admin/SwitchAdmin';
import api from '../../services/api';

const APRESENTACAO_FLAGS = {
  perfil_jornada_leitura: {
    nome: 'Jornada de leitura',
    icone: 'fa-route',
    categoria: 'Experiência do leitor',
  },
  moderacao_no_perfil: {
    nome: 'Moderação no perfil',
    icone: 'fa-user-shield',
    categoria: 'Operação administrativa',
  },
  autenticacao_2fa: {
    nome: 'Autenticação em duas etapas',
    icone: 'fa-shield-halved',
    categoria: 'Segurança da conta',
  },
  banner_anuncios: {
    nome: 'Banner de anúncios',
    icone: 'fa-rectangle-ad',
    categoria: 'Monetização',
  },
  analytics_autor: {
    nome: 'Analytics do Autor',
    icone: 'fa-chart-line',
    categoria: 'Inteligência editorial',
  },
};

function apresentacaoDaFlag(chave) {
  return APRESENTACAO_FLAGS[chave] || {
    nome: chave.replaceAll('_', ' '),
    icone: 'fa-flask',
    categoria: 'Funcionalidade experimental',
  };
}

function formatarAtualizacao(valor) {
  if (!valor) return 'Ainda não alterada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

function AdminFeatureFlags() {
  const { user } = useContext(AuthContext);
  const [flags, setFlags] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [salvando, setSalvando] = useState('');
  const [toast, setToast] = useState(null);
  const fecharToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let ativo = true;
    setErro('');
    api.get('/dashboard/feature-flags/')
      .then((resposta) => ativo && setFlags(resposta.data))
      .catch(() => ativo && setErro('Não foi possível carregar as feature flags.'));
    return () => { ativo = false; };
  }, [tentativa]);

  const resumo = useMemo(() => {
    const total = flags?.length || 0;
    const ativas = flags?.filter((flag) => flag.disponivel && flag.habilitada).length || 0;
    const indisponiveis = flags?.filter((flag) => !flag.disponivel).length || 0;
    return { total, ativas, inativas: total - ativas - indisponiveis, indisponiveis };
  }, [flags]);

  const alternar = async (flag, habilitada) => {
    if (!flag.disponivel) return;
    setSalvando(flag.chave);
    setToast(null);
    try {
      const resposta = await api.patch('/dashboard/feature-flags/', {
        chave: flag.chave,
        habilitada,
      });
      const atualizadaEm = new Date().toISOString();
      setFlags((atuais) => atuais.map((item) => item.chave === flag.chave ? {
        ...item,
        habilitada: resposta.data.habilitada,
        atualizada_em: atualizadaEm,
        atualizada_por: user?.username || item.atualizada_por,
      } : item));
      window.dispatchEvent(new CustomEvent('parabook:feature-flags-atualizadas'));
      const apresentacao = apresentacaoDaFlag(flag.chave);
      setToast({
        tipo: 'sucesso',
        mensagem: `${apresentacao.nome} ${habilitada ? 'ativada' : 'desativada'} com sucesso.`,
      });
    } catch (error) {
      setToast({
        tipo: 'erro',
        mensagem: error.response?.data?.detail || 'Não foi possível alterar esta feature flag.',
      });
    } finally {
      setSalvando('');
    }
  };

  return (
    <AdminAvancadoShell
      titulo="Feature flags"
      subtitulo="Controle a disponibilidade de funcionalidades do ParaBook sem alterar o código ou interromper a plataforma."
      icone="fa-toggle-on"
      tom="roxo"
      selo={{ rotulo: 'Funcionalidades ativas', valor: flags ? `${resumo.ativas} de ${resumo.total}` : 'Consultando…', tom: 'roxo' }}
      toast={toast}
      onCloseToast={fecharToast}
    >
      <section className="aa-alerta-operacao" aria-labelledby="aviso-feature-flags">
        <i className="fa-solid fa-bolt" aria-hidden="true"></i>
        <div>
          <h2 id="aviso-feature-flags">As alterações entram em vigor imediatamente</h2>
          <p>Antes de desligar uma funcionalidade, confirme se nenhum fluxo crítico depende dela. Cada alteração fica registrada na Trilha de auditoria.</p>
        </div>
      </section>

      <section className="aa-feature-resumo" aria-label="Resumo das feature flags">
        <article>
          <span className="aa-feature-resumo-icone"><i className="fa-solid fa-layer-group" aria-hidden="true"></i></span>
          <div><strong>{resumo.total}</strong><span>Total configurado</span></div>
        </article>
        <article className="is-active">
          <span className="aa-feature-resumo-icone"><i className="fa-solid fa-circle-check" aria-hidden="true"></i></span>
          <div><strong>{resumo.ativas}</strong><span>Ativas agora</span></div>
        </article>
        <article>
          <span className="aa-feature-resumo-icone"><i className="fa-solid fa-circle-pause" aria-hidden="true"></i></span>
          <div><strong>{resumo.inativas}</strong><span>Desativadas</span></div>
        </article>
        <article className="is-unavailable">
          <span className="aa-feature-resumo-icone"><i className="fa-solid fa-hourglass-half" aria-hidden="true"></i></span>
          <div><strong>{resumo.indisponiveis}</strong><span>Indisponíveis</span></div>
        </article>
      </section>

      <section className="aa-secao" aria-labelledby="flags-disponiveis">
        <div className="aa-secao-titulo">
          <div><span>Controle de entrega</span><h2 id="flags-disponiveis">Funcionalidades configuradas</h2></div>
          <small>{flags ? `${resumo.total} ${resumo.total === 1 ? 'flag cadastrada' : 'flags cadastradas'}` : 'Sincronizando estados'}</small>
        </div>

        {erro ? (
          <div className="aa-estado aa-estado--erro" role="alert">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
            <p>{erro}</p>
            <button type="button" className="btn-outline" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button>
          </div>
        ) : !flags ? (
          <div className="aa-estado" role="status">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
            <p>Consultando funcionalidades e estados atuais...</p>
          </div>
        ) : flags.length === 0 ? (
          <div className="aa-estado">
            <i className="fa-solid fa-toggle-off" aria-hidden="true"></i>
            <h3>Nenhuma flag cadastrada</h3>
            <p>As chaves são criadas pelo backend para evitar controles sem implementação correspondente.</p>
          </div>
        ) : (
          <div className="aa-feature-grid">
            {flags.map((flag) => {
              const apresentacao = apresentacaoDaFlag(flag.chave);
              const alterando = salvando === flag.chave;
              const indisponivel = !flag.disponivel;
              return (
                <article key={flag.chave} className={`aa-feature-card ${flag.habilitada ? 'is-active' : ''} ${indisponivel ? 'is-unavailable' : ''}`}>
                  <div className="aa-feature-card-topo">
                    <span className="aa-feature-icone"><i className={`fa-solid ${apresentacao.icone}`} aria-hidden="true"></i></span>
                    <span className={`aa-feature-estado ${flag.habilitada ? 'is-active' : ''} ${indisponivel ? 'is-unavailable' : ''}`}>
                      <i className={`fa-solid ${indisponivel ? 'fa-hourglass-half' : flag.habilitada ? 'fa-circle-check' : 'fa-circle-pause'}`} aria-hidden="true"></i>
                      {indisponivel ? 'Indisponível · Em breve' : flag.habilitada ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="aa-feature-conteudo">
                    <span>{apresentacao.categoria}</span>
                    <h3>{apresentacao.nome}</h3>
                    <p>{flag.descricao || 'Esta funcionalidade ainda não possui uma descrição operacional.'}</p>
                    <code>{flag.chave}</code>
                  </div>
                  <footer className="aa-feature-card-rodape">
                    <div>
                      <span>{indisponivel ? 'Aguardando implementação' : alterando ? 'Salvando alteração…' : `Atualizada em ${formatarAtualizacao(flag.atualizada_em)}`}</span>
                      <small>{indisponivel ? 'ativação bloqueada' : flag.atualizada_por ? `por @${flag.atualizada_por}` : 'sem responsável registrado'}</small>
                    </div>
                    <SwitchAdmin
                      ligado={flag.habilitada}
                      onChange={(habilitada) => alternar(flag, habilitada)}
                      ariaLabel={indisponivel ? `${apresentacao.nome} indisponível` : `${flag.habilitada ? 'Desativar' : 'Ativar'} ${apresentacao.nome}`}
                      tamanho="grande"
                      disabled={Boolean(salvando) || indisponivel}
                    />
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AdminAvancadoShell>
  );
}

export default AdminFeatureFlags;
