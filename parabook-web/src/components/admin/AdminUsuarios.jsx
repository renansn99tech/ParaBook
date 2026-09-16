import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/auth-context';
import api from '../../services/api';

const FILTROS = [['todos', 'Todos'], ['autor', 'Autor'], ['aguardando_aprovacao', 'Pendente'], ['suspenso', 'Suspenso']];
const PAPEIS = { admin: ['ADM', 'admin'], moderador: ['Moderador', 'admin'], autor: ['Autor', 'autor'], aguardando_aprovacao: ['Pendente', 'pendente'], leitor: ['Leitor', 'leitor'] };
const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const iniciais = (usuario) => (usuario.nome || usuario.username || 'PB').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
const formatarData = (data) => data ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(data)) : 'Não registrada';
const atividade = (data) => { if (!data) return 'Nunca acessou'; const dias = Math.floor(Math.max(0, Date.now() - new Date(data).getTime()) / 86400000); return dias === 0 ? 'Hoje' : dias === 1 ? 'Ontem' : `Há ${dias} dias`; };
const celulaCsv = (valor) => { let texto = String(valor ?? ''); if (/^[=+\-@]/.test(texto.trimStart())) texto = `'${texto}`; return `"${texto.replaceAll('"', '""')}"`; };

function ModalGovernanca({ usuario, acao, onClose, onConcluido }) {
  const [duracao, setDuracao] = useState(3);
  const [categoria, setCategoria] = useState('conduta');
  const [papel, setPapel] = useState(usuario.tipo === 'autor' ? 'leitor' : 'autor');
  const [justificativa, setJustificativa] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const titulo = acao === 'suspender' ? 'Suspender conta' : acao === 'reativar' ? 'Reativar conta' : 'Alterar papel';

  const enviar = async (evento) => {
    evento.preventDefault();
    setEnviando(true); setErro('');
    try {
      if (acao === 'suspender') await api.post(`/dashboard/usuarios/${usuario.id}/suspensao/`, { duracao_dias: Number(duracao), categoria, justificativa, senha_atual: senha });
      if (acao === 'reativar') await api.delete(`/dashboard/usuarios/${usuario.id}/suspensao/`, { data: { justificativa, senha_atual: senha } });
      if (acao === 'papel') await api.patch(`/dashboard/usuarios/${usuario.id}/papel/`, { novo_papel: papel, justificativa, senha_atual: senha });
      await onConcluido(); onClose();
    } catch (error) {
      const dados = error.response?.data || {};
      setErro(dados.detail || Object.values(dados).flat()[0] || 'Não foi possível concluir a ação.');
    } finally { setEnviando(false); }
  };

  return <div className="admin-modal-backdrop" role="presentation"><section className="admin-modal-governanca" role="dialog" aria-modal="true" aria-labelledby="governanca-titulo"><header><div><span>Governança de conta</span><h2 id="governanca-titulo">{titulo}</h2><p>@{usuario.username}</p></div><button type="button" onClick={onClose} aria-label="Fechar"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button></header><form onSubmit={enviar}>{acao === 'suspender' && <><label>Duração<select value={duracao} onChange={(e) => setDuracao(e.target.value)}><option value="3">3 dias</option><option value="7">7 dias</option><option value="15">15 dias</option><option value="30">30 dias</option></select></label><label>Categoria<select value={categoria} onChange={(e) => setCategoria(e.target.value)}><option value="conduta">Conduta</option><option value="seguranca">Segurança</option><option value="conteudo">Conteúdo</option><option value="termos">Termos de uso</option></select></label></>}{acao === 'papel' && <label>Novo papel<select value={papel} onChange={(e) => setPapel(e.target.value)}><option value="leitor">Leitor</option><option value="autor">Autor</option></select></label>}<label>Justificativa<textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} minLength="10" maxLength="2000" required /></label><label>Sua senha atual<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required /></label>{erro && <p className="admin-modal-erro" role="alert">{erro}</p>}<footer><button type="button" className="btn-outline" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary-action" disabled={enviando}>{enviando ? 'Processando...' : 'Confirmar'}</button></footer></form></section></div>;
}

function AdminUsuarios() {
  const { user: operador } = useContext(AuthContext);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroUsuarios, setFiltroUsuarios] = useState('todos');
  const [modal, setModal] = useState(null);
  const carregar = async () => { const resposta = await api.get('/dashboard/usuarios/'); setUsuarios(resposta.data); };
  useEffect(() => { let ativo = true; api.get('/dashboard/usuarios/').then((r) => ativo && setUsuarios(r.data)).catch(console.error).finally(() => ativo && setLoading(false)); return () => { ativo = false; }; }, []);

  const contagens = useMemo(() => ({ todos: usuarios.length, autor: usuarios.filter((u) => u.tipo === 'autor' && !u.suspensao?.ativa).length, aguardando_aprovacao: usuarios.filter((u) => u.tipo === 'aguardando_aprovacao' && !u.suspensao?.ativa).length, suspenso: usuarios.filter((u) => u.suspensao?.ativa).length }), [usuarios]);
  const usuariosVisiveis = useMemo(() => { const termo = normalizar(busca.trim()); return usuarios.filter((u) => { const atendeFiltro = filtroUsuarios === 'todos' || (filtroUsuarios === 'suspenso' ? u.suspensao?.ativa : !u.suspensao?.ativa && u.tipo === filtroUsuarios); return atendeFiltro && (!termo || normalizar(`${u.nome} ${u.username} ${u.email}`).includes(termo)); }); }, [busca, filtroUsuarios, usuarios]);
  const exportar = () => { const cabecalho = ['Nome', 'Usuário', 'E-mail', 'Papel', 'Status', 'Entrada']; const linhas = usuariosVisiveis.map((u) => [u.nome, `@${u.username}`, u.email, PAPEIS[u.tipo]?.[0] || u.tipo, u.suspensao?.ativa ? 'Suspensa' : 'Ativa', formatarData(u.date_joined)]); const conteudo = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob([`\ufeff${conteudo}`], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'usuarios-parabook.csv'; link.click(); URL.revokeObjectURL(url); };

  return <section className="secao admin-usuarios-page"><h1>Gerenciar Usuários</h1><p className="admin-subtitulo">Moderadores podem suspender temporariamente leitores/autores e alterar esses papéis com reautenticação e auditoria.</p><div className="dash-lista-toolbar"><label className="dash-busca"><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span className="visually-hidden">Buscar usuários</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, @usuário ou e-mail" /></label><div className="admin-filtros" role="group" aria-label="Filtrar usuários por papel">{FILTROS.map(([chave, rotulo]) => <button key={chave} type="button" className="admin-filtro" aria-pressed={filtroUsuarios === chave} onClick={() => setFiltroUsuarios(chave)}>{rotulo}<small>{contagens[chave]}</small></button>)}</div></div><div className="admin-panel admin-list-container dash-usuarios-container">{loading ? <p className="admin-estado">Carregando...</p> : usuariosVisiveis.length ? <div className="dash-usuarios-tabela" role="table" aria-label="Contas do ParaBook"><div className="dash-usuarios-linha dash-usuarios-cabecalho" role="row"><span role="columnheader">Usuário</span><span role="columnheader">Papel</span><span role="columnheader">Atividade</span><span role="columnheader">Entrada</span><span role="columnheader">Ações</span></div>{usuariosVisiveis.map((u) => { const [papel, classe] = PAPEIS[u.tipo] || [u.tipo, 'leitor']; const privilegiada = u.is_staff || u.is_superuser || ['moderador', 'admin'].includes(u.tipo); const propria = operador?.id === u.id || operador?.usuario === u.id; return <div key={u.id} className="dash-usuarios-linha" role="row"><span className="dash-usuario-identidade" role="cell"><span className="dash-iniciais" aria-hidden="true">{iniciais(u)}</span><span><strong>{u.nome}</strong><small>@{u.username}{u.email ? ` · ${u.email}` : ''}</small></span></span><span role="cell"><span className={`admin-pill ${u.suspensao?.ativa ? 'suspenso' : classe}`}>{u.suspensao?.ativa ? 'Suspenso' : papel}</span></span><span role="cell">{atividade(u.last_login)}</span><span role="cell">{formatarData(u.date_joined)}</span><span className="dash-usuario-acoes" role="cell"><Link to={`/perfil/${u.username}`} title="Ver perfil"><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></Link>{!privilegiada && !propria && <>{u.suspensao?.ativa ? <button type="button" title="Reativar conta" onClick={() => setModal({ usuario: u, acao: 'reativar' })}><i className="fa-solid fa-user-check" aria-hidden="true"></i></button> : <button type="button" title="Suspender por prazo definido" onClick={() => setModal({ usuario: u, acao: 'suspender' })}><i className="fa-solid fa-user-clock" aria-hidden="true"></i></button>}<button type="button" title="Alterar papel entre leitor e autor" onClick={() => setModal({ usuario: u, acao: 'papel' })}><i className="fa-solid fa-user-gear" aria-hidden="true"></i></button></>}</span></div>; })}</div> : <div className="dash-estado-vazio"><strong>Nenhuma conta encontrada.</strong></div>} {!loading && <footer className="dash-lista-rodape"><span>{usuariosVisiveis.length} de {usuarios.length} contas</span><button type="button" className="btn-outline" onClick={exportar} disabled={!usuariosVisiveis.length}><i className="fa-solid fa-file-export" aria-hidden="true"></i> Exportar lista</button></footer>}</div>{modal && <ModalGovernanca {...modal} onClose={() => setModal(null)} onConcluido={carregar} />}</section>;
}

export default AdminUsuarios;
