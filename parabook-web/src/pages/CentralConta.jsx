import { useContext, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import { aplicarTipografia, carregarPreviewsTipograficas, PRESETS_TIPOGRAFICOS } from '../services/tipografia';
import '../assets/css/perfil.css';

function Aparencia() {
  const { user, recarregarUsuario } = useContext(AuthContext);
  const [selecionada, setSelecionada] = useState(user.tipografia_efetiva || 'padrao');
  const [salvando, setSalvando] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => { carregarPreviewsTipograficas(); }, []);

  const escolher = async (chave) => {
    setSalvando(chave);
    setMensagem('');
    try {
      const resposta = await api.patch('/perfis/meu-perfil/', { tipografia: chave });
      const efetiva = resposta.data.tipografia_efetiva;
      setSelecionada(efetiva);
      aplicarTipografia(efetiva);
      await recarregarUsuario();
      setMensagem('Tipografia aplicada em toda a experiência Web.');
    } catch (error) {
      setMensagem(error.response?.data?.tipografia?.[0] || 'Não foi possível alterar a tipografia.');
    } finally {
      setSalvando('');
    }
  };

  return (
    <div className="tipografia-configuracao">
      <div className="tipografia-introducao">
        <span className="tipografia-introducao-icone"><i className="fa-solid fa-font" aria-hidden="true"></i></span>
        <div><h2>Sua voz visual</h2><p>Escolha um par tipográfico para a interface e os títulos editoriais do ParaBook.</p></div>
      </div>
      <div className="tipografia-opcoes">
        {(user.tipografias_disponiveis || []).map((opcao) => {
          const preset = PRESETS_TIPOGRAFICOS[opcao.chave];
          const ativa = selecionada === opcao.chave;
          return (
            <article key={opcao.chave} className={`tipografia-opcao tipografia-opcao--${opcao.chave} ${ativa ? 'is-active' : ''} ${opcao.disponivel ? '' : 'is-locked'}`}>
              <header><span>{opcao.requisito}</span>{ativa && <strong><i className="fa-solid fa-circle-check" aria-hidden="true"></i> Em uso</strong>}{!opcao.disponivel && <strong><i className="fa-solid fa-lock" aria-hidden="true"></i> Bloqueada</strong>}</header>
              <div className="tipografia-amostra"><small>{preset.interface} + {preset.editorial}</small><p>{preset.amostra}</p><span>A leitura aproxima pessoas, ideias e novos mundos.</span></div>
              <div className="tipografia-opcao-rodape"><div><h3>{opcao.nome}</h3><p>{preset.descricao}</p></div><button type="button" className={ativa ? 'btn-outline' : 'btn-primary-action'} disabled={!opcao.disponivel || Boolean(salvando) || ativa} onClick={() => escolher(opcao.chave)}>{salvando === opcao.chave ? 'Aplicando...' : ativa ? 'Selecionada' : 'Usar esta opção'}</button></div>
            </article>
          );
        })}
      </div>
      {mensagem && <p className="tipografia-mensagem" role="status">{mensagem}</p>}
    </div>
  );
}

function Preferencias() {
  const [dados, setDados] = useState(null);
  useEffect(() => { api.get('/auth/preferencias-notificacao/').then((res) => setDados(res.data)); }, []);
  const alternar = async (campo) => {
    const res = await api.patch('/auth/preferencias-notificacao/', { [campo]: !dados[campo] });
    setDados(res.data);
  };
  if (!dados) return <p role="status">Carregando preferências...</p>;
  const opcoes = [['notificacoes_email', 'E-mails gerais'], ['notificacoes_comunidades', 'Atividade de comunidades'], ['notificacoes_assinaturas', 'Assinaturas e pagamentos']];
  return <div className="central-conta-lista">{opcoes.map(([campo, rotulo]) => <button type="button" className="central-conta-switch" role="switch" aria-checked={dados[campo]} key={campo} onClick={() => alternar(campo)}><span>{rotulo}</span><strong>{dados[campo] ? 'Ativado' : 'Desativado'}</strong></button>)}</div>;
}

function Auditoria() {
  const [registros, setRegistros] = useState(null);
  useEffect(() => { api.get('/dashboard/auditoria/').then((res) => setRegistros(res.data)); }, []);
  if (!registros) return <p role="status">Carregando auditoria...</p>;
  return <ul className="central-conta-lista">{registros.map((item) => <li key={item.id}><span><strong>{item.acao}</strong><small>{item.ator} · {item.recurso} #{item.recurso_id || '—'} · {new Date(item.criado_em).toLocaleString('pt-BR')}</small></span><span>{item.sucesso ? 'Sucesso' : 'Falha'}</span></li>)}</ul>;
}

function FeatureFlags() {
  const [flags, setFlags] = useState(null);
  useEffect(() => { api.get('/dashboard/feature-flags/').then((res) => setFlags(res.data)); }, []);
  const alternar = async (flag) => {
    const res = await api.patch('/dashboard/feature-flags/', { chave: flag.chave, habilitada: !flag.habilitada });
    setFlags((atuais) => atuais.map((item) => item.chave === flag.chave ? { ...item, habilitada: res.data.habilitada } : item));
  };
  if (!flags) return <p role="status">Carregando feature flags...</p>;
  return <div className="central-conta-lista">{flags.map((flag) => <button type="button" className="central-conta-switch" role="switch" aria-checked={flag.habilitada} key={flag.chave} onClick={() => alternar(flag)}><span><strong>{flag.chave}</strong><small>{flag.descricao}</small></span><strong>{flag.habilitada ? 'Ativa' : 'Inativa'}</strong></button>)}</div>;
}

const PAGINAS = {
  aparencia: ['Tipografia e aparência', Aparencia, false],
  notificacoes: ['Notificações e e-mails', Preferencias, false],
  auditoria: ['Trilha de auditoria', Auditoria, true],
  'feature-flags': ['Feature flags', FeatureFlags, true],
};

function CentralConta() {
  const { secao } = useParams();
  const { user, loading } = useContext(AuthContext);
  const pagina = PAGINAS[secao];
  if (loading) return <main className="central-conta-page"><p role="status">Carregando...</p></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (!pagina) return <Navigate to="/perfil/configuracoes" replace />;
  const [titulo, Conteudo, exigeAdmin] = pagina;
  const admin = user.tipo === 'admin' && Boolean(user.is_staff || user.is_superuser);
  if (exigeAdmin && !admin) return <Navigate to="/perfil/configuracoes" replace />;
  return <main className="central-conta-page"><header><Link to="/perfil/configuracoes"><i className="fa-solid fa-arrow-left" aria-hidden="true"></i> Configurações</Link><h1>{titulo}</h1><p>Configurações protegidas da sua conta ParaBook.</p></header><section className="content-glass-card"><Conteudo /></section></main>;
}

export default CentralConta;
