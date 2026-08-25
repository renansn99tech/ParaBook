import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/auth-context';
import { obterAvatarPerfil } from '../../services/avatarPerfil';
import ToastAdmin from './ToastAdmin';
import '../../assets/css/admin-avancado.css';

function AdminAvancadoShell({ titulo, subtitulo, icone, tom = 'roxo', selo, toast, onCloseToast, children }) {
  const { user } = useContext(AuthContext);
  return (
    <main className={`admin-avancado admin-avancado--${tom}`}>
      <nav className="aa-nav" aria-label="Navegação administrativa">
        <Link to="/" className="aa-marca"><i className="fa-solid fa-book-open-reader" aria-hidden="true"></i><span>Para<strong>Book</strong></span></Link>
        <ol className="aa-breadcrumb">
          <li><Link to="/perfil?tab=configuracoes">Perfil</Link></li>
          <li><Link to="/perfil/configuracoes">Configurações avançadas</Link></li>
          <li aria-current="page">{titulo}</li>
        </ol>
        <div className="aa-identidade-admin">
          <span className="aa-so-admin"><i className="fa-solid fa-lock" aria-hidden="true"></i> Só admins</span>
          <img src={obterAvatarPerfil(user)} alt="" width="42" height="42" />
          <span><strong>{user?.nome || user?.username}</strong><small>@{user?.username}</small></span>
        </div>
      </nav>

      <header className="aa-cabecalho">
        <div className={`aa-cabecalho-icone aa-tom--${tom}`}><i className={`fa-solid ${icone}`} aria-hidden="true"></i></div>
        <div className="aa-cabecalho-texto"><h1>{titulo}</h1><p>{subtitulo}</p></div>
        {selo && <div className={`aa-selo aa-tom--${selo.tom || tom}`}><span>{selo.rotulo}</span><strong>{selo.valor}</strong></div>}
      </header>

      <div className="aa-conteudo">{children}</div>
      <ToastAdmin toast={toast} onClose={onCloseToast} />
    </main>
  );
}

export default AdminAvancadoShell;
