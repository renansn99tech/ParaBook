import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const FILTROS = [
  ['todos', 'Todos'],
  ['autor', 'Autor'],
  ['aguardando_aprovacao', 'Pendente'],
  ['suspenso', 'Suspenso'],
];

const PAPEIS = {
  admin: ['ADM', 'admin'],
  autor: ['Autor', 'autor'],
  aguardando_aprovacao: ['Pendente', 'pendente'],
  leitor: ['Leitor', 'leitor'],
};

function normalizar(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function iniciais(usuario) {
  return (usuario.nome || usuario.username || 'PB').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
}

function formatarData(data) {
  if (!data) return 'Não registrada';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(data));
}

function atividade(data) {
  if (!data) return 'Nunca acessou';
  const dias = Math.floor(Math.max(0, Date.now() - new Date(data).getTime()) / 86400000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return `Há ${dias} dias`;
}

function celulaCsv(valor) {
  let texto = String(valor ?? '');
  if (/^[=+\-@]/.test(texto.trimStart())) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
}

function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroUsuarios, setFiltroUsuarios] = useState('todos');

  useEffect(() => {
    let ativo = true;
    api.get('/dashboard/usuarios/').then((resposta) => ativo && setUsuarios(resposta.data)).catch((error) => console.error('Erro ao buscar usuários', error)).finally(() => ativo && setLoading(false));
    return () => { ativo = false; };
  }, []);

  const contagens = useMemo(() => ({
    todos: usuarios.length,
    autor: usuarios.filter((usuario) => usuario.tipo === 'autor' && usuario.is_active).length,
    aguardando_aprovacao: usuarios.filter((usuario) => usuario.tipo === 'aguardando_aprovacao' && usuario.is_active).length,
    suspenso: usuarios.filter((usuario) => !usuario.is_active).length,
  }), [usuarios]);

  const usuariosVisiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return usuarios.filter((usuario) => {
      const atendeFiltro = filtroUsuarios === 'todos'
        || (filtroUsuarios === 'suspenso' ? !usuario.is_active : usuario.is_active && usuario.tipo === filtroUsuarios);
      const atendeBusca = !termo || normalizar(`${usuario.nome} ${usuario.username} ${usuario.email}`).includes(termo);
      return atendeFiltro && atendeBusca;
    });
  }, [busca, filtroUsuarios, usuarios]);

  const limpar = () => { setBusca(''); setFiltroUsuarios('todos'); };

  const exportar = () => {
    const cabecalho = ['Nome', 'Usuário', 'E-mail', 'Papel', 'Status', 'Entrada'];
    const linhas = usuariosVisiveis.map((usuario) => [usuario.nome, `@${usuario.username}`, usuario.email, PAPEIS[usuario.tipo]?.[0] || usuario.tipo, usuario.is_active ? 'Ativa' : 'Suspensa', formatarData(usuario.date_joined)]);
    const conteudo = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${conteudo}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'usuarios-parabook.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="secao admin-usuarios-page">
      <h1>Gerenciar Usuários</h1>
      <p className="admin-subtitulo">Localize contas, confira papéis e acompanhe a atividade na plataforma.</p>

      <div className="dash-lista-toolbar">
        <label className="dash-busca"><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span className="visually-hidden">Buscar usuários</span><input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Nome, @usuário ou e-mail" /></label>
        <div className="admin-filtros" role="group" aria-label="Filtrar usuários por papel">{FILTROS.map(([chave, rotulo]) => <button key={chave} type="button" className="admin-filtro" aria-pressed={filtroUsuarios === chave} onClick={() => setFiltroUsuarios(chave)}>{rotulo}<small>{contagens[chave]}</small></button>)}</div>
      </div>

      <div className="admin-panel admin-list-container dash-usuarios-container">
        {loading ? <p className="admin-estado">Carregando...</p> : usuariosVisiveis.length > 0 ? <div className="dash-usuarios-tabela" role="table" aria-label="Contas do ParaBook">
          <div className="dash-usuarios-linha dash-usuarios-cabecalho" role="row"><span role="columnheader">Usuário</span><span role="columnheader">Papel</span><span role="columnheader">Atividade</span><span role="columnheader">Entrada</span><span role="columnheader">Ações</span></div>
          {usuariosVisiveis.map((usuario) => {
            const [papel, classe] = PAPEIS[usuario.tipo] || [usuario.tipo, 'leitor'];
            return <div key={usuario.id} className="dash-usuarios-linha" role="row"><span className="dash-usuario-identidade" role="cell"><span className="dash-iniciais" aria-hidden="true">{iniciais(usuario)}</span><span><strong>{usuario.nome}</strong><small>@{usuario.username}{usuario.email ? ` · ${usuario.email}` : ''}</small></span></span><span role="cell"><span className={`admin-pill ${usuario.is_active ? classe : 'suspenso'}`}>{usuario.is_active ? papel : 'Suspenso'}</span></span><span role="cell">{atividade(usuario.last_login)}</span><span role="cell">{formatarData(usuario.date_joined)}</span><span className="dash-usuario-acoes" role="cell"><Link to={`/perfil/${usuario.username}`} aria-label={`Ver perfil de @${usuario.username}`} title="Ver perfil"><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></Link></span></div>;
          })}
        </div> : <div className="dash-estado-vazio dash-estado-vazio--busca"><i className="fa-solid fa-user-slash" aria-hidden="true"></i><span><strong>{busca ? `Nenhum resultado para “${busca}”` : `Nenhuma conta do tipo ${FILTROS.find(([chave]) => chave === filtroUsuarios)?.[1]}`}</strong><small>Altere os critérios para voltar à lista completa.</small></span><button type="button" onClick={limpar}>Limpar busca e filtro</button></div>}
        {!loading && <footer className="dash-lista-rodape"><span>{usuariosVisiveis.length} de {usuarios.length} contas</span><button type="button" className="btn-outline" onClick={exportar} disabled={!usuariosVisiveis.length}><i className="fa-solid fa-file-export" aria-hidden="true"></i> Exportar lista</button></footer>}
      </div>
    </section>
  );
}

export default AdminUsuarios;
