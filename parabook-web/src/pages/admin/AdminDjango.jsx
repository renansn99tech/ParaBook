import { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/auth-context';
import AdminAvancadoShell from '../../components/admin/AdminAvancadoShell';
import api from '../../services/api';
import swal from '../../services/swal';

function formatarUltimoAcesso(valor) {
  if (!valor) return 'Ainda não registrado';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

function AdminDjango() {
  const { user } = useContext(AuthContext);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [toast, setToast] = useState(null);
  const fecharToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let ativo = true;
    setErro('');
    api.get('/dashboard/modelos-admin/')
      .then((resposta) => ativo && setDados(resposta.data))
      .catch(() => ativo && setErro('Não foi possível carregar os atalhos administrativos.'));
    return () => { ativo = false; };
  }, [tentativa]);

  const registrarAcesso = () => {
    api.post('/dashboard/django-admin/acesso/', {})
      .then(() => {
        setDados((atual) => ({ ...atual, ultimo_acesso: new Date().toISOString() }));
        setToast({ tipo: 'sucesso', mensagem: 'Acesso ao Django admin registrado na auditoria.' });
      })
      .catch(() => swal.fire({
        icon: 'error',
        title: 'Acesso não registrado',
        text: 'O Django admin foi aberto, mas não foi possível registrar o atalho na auditoria.',
      }));
  };

  const papel = user?.is_superuser ? 'staff + superuser' : 'staff';
  return (
    <AdminAvancadoShell
      titulo="Django admin"
      subtitulo="Acesso técnico aos modelos registrados no painel nativo do Django. Use esta porta somente quando a operação ainda não existir no ParaBook."
      icone="fa-screwdriver-wrench"
      tom="perigo"
      selo={{ rotulo: 'Último acesso', valor: formatarUltimoAcesso(dados?.ultimo_acesso), tom: 'perigo' }}
      toast={toast}
      onCloseToast={fecharToast}
    >
      <section className="aa-alerta-perigo" aria-labelledby="aviso-django-admin">
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <div><h2 id="aviso-django-admin">Alterações entram diretamente no banco</h2><p>Aqui não há validação das regras de negócio do ParaBook. Prefira a interface da plataforma quando ela existir e use o Django admin somente para operações não cobertas.</p></div>
      </section>

      <section className="aa-secao" aria-labelledby="modelos-django-admin">
        <div className="aa-secao-titulo"><div><span>Atalhos técnicos</span><h2 id="modelos-django-admin">Modelos disponíveis</h2></div><small>Contagens atualizadas a cada 5 minutos</small></div>
        {erro ? (
          <div className="aa-estado aa-estado--erro" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><p>{erro}</p><button type="button" className="btn-outline" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button></div>
        ) : !dados ? (
          <div className="aa-estado" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>Consultando modelos registrados...</p></div>
        ) : (
          <div className="aa-modelos-grid">
            {dados.modelos.map((modelo) => (
              <a key={modelo.chave} className="aa-modelo-card" href={modelo.url} target="_blank" rel="noopener noreferrer">
                <span className="aa-modelo-icone"><i className={`fa-solid ${modelo.icone}`} aria-hidden="true"></i></span>
                <span className="aa-modelo-texto"><strong>{modelo.nome}</strong><code>{modelo.modelo}</code></span>
                <b>{modelo.contagem ?? '—'}</b>
                <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              </a>
            ))}
          </div>
        )}
      </section>

      {dados?.django_admin_url && (
        <section className="aa-saida-admin">
          <span className="aa-saida-icone"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i></span>
          <div><h2>Abrir o Django admin completo</h2><p>@{user?.username} · {papel} · o uso deste atalho será registrado na auditoria</p></div>
          <a className="btn-primary" href={dados.django_admin_url} target="_blank" rel="noopener noreferrer" onClick={registrarAcesso}>Abrir painel <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
        </section>
      )}
    </AdminAvancadoShell>
  );
}

export default AdminDjango;
