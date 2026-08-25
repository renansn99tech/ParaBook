import { useId } from 'react';
import { Link } from 'react-router-dom';

function ItemConfiguracao({ icone, titulo, estado, to, externo = false, indisponivel = false, tooltip = '' }) {
  const tooltipId = useId();
  const conteudo = (
    <>
      <span className="config-avancado-item-icone" aria-hidden="true">
        <i className={`fa-solid ${icone}`}></i>
      </span>
      <span className="config-avancado-item-texto">
        <strong>{titulo}</strong>
        {estado && <small>{estado}</small>}
      </span>
      {!indisponivel && !tooltip && <i className="fa-solid fa-chevron-right config-avancado-item-seta" aria-hidden="true"></i>}
    </>
  );

  if (tooltip) {
    return (
      <div className="config-avancado-item is-policy" tabIndex="0" aria-describedby={tooltipId}>
        {conteudo}
        <span id={tooltipId} className="config-avancado-tooltip" role="tooltip">{tooltip}</span>
      </div>
    );
  }

  if (indisponivel) {
    return (
      <div className="config-avancado-item is-disabled" aria-disabled="true">
        {conteudo}
        <span className="config-avancado-em-breve">EM BREVE</span>
      </div>
    );
  }

  if (externo) {
    return (
      <a className="config-avancado-item" href={to} target="_blank" rel="noopener noreferrer">
        {conteudo}
      </a>
    );
  }

  return <Link className="config-avancado-item" to={to}>{conteudo}</Link>;
}

function GrupoConfiguracao({ titulo, descricao, admin = false, children }) {
  return (
    <section className={`config-avancado-grupo ${admin ? 'config-avancado-grupo--admin' : ''}`}>
      <div className="config-avancado-grupo-cabecalho">
        {admin && <i className="fa-solid fa-lock" aria-hidden="true"></i>}
        <div>
          <h3>{titulo}</h3>
          {descricao && <p>{descricao}</p>}
        </div>
      </div>
      <div className={`config-avancado-grid ${admin ? 'config-avancado-grid--admin' : ''}`}>
        {children}
      </div>
    </section>
  );
}

function ConfiguracoesAvancadas({ user, mostrarAtalhoPagina = false }) {
  const adminAutorizado = user?.tipo === 'admin' && Boolean(user?.is_staff || user?.is_superuser);

  return (
    <div className="config-avancado-conteudo">
      {mostrarAtalhoPagina && (
        <div className="config-avancado-faixa">
          <span>Tudo aqui também vive em página própria, para links de suporte e segurança.</span>
          <Link to="/perfil/configuracoes">
            Abrir /perfil/configuracoes
            <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </Link>
        </div>
      )}

      <GrupoConfiguracao titulo="Segurança e acesso">
        <ItemConfiguracao icone="fa-key" titulo="Alterar senha" to="/perfil/alterar-senha" />
        <ItemConfiguracao icone="fa-laptop" titulo="Sessões e dispositivos" indisponivel />
        <ItemConfiguracao icone="fa-shield-halved" titulo="Verificação em duas etapas" indisponivel />
      </GrupoConfiguracao>

      <GrupoConfiguracao titulo="Privacidade, dados e leitura">
        <ItemConfiguracao
          icone="fa-font"
          titulo="Tipografia do ParaBook"
          estado={user?.tipografia_nome || 'ParaBook Original'}
          to="/perfil/configuracoes/aparencia"
        />
        {adminAutorizado ? (
          <ItemConfiguracao
            icone="fa-user-shield"
            titulo="Visibilidade do perfil"
            estado="Perfil Administrativo · Visualização totalmente privativa"
            tooltip="Somente outros administradores podem visualizar o perfil."
          />
        ) : (
          <ItemConfiguracao
            icone="fa-user-lock"
            titulo="Visibilidade do perfil"
            estado={user?.perfil_privado ? 'Perfil privado' : 'Perfil público'}
            to="/perfil?tab=configuracoes"
          />
        )}
        <ItemConfiguracao icone="fa-file-export" titulo="Exportar meus dados (LGPD)" indisponivel />
        <ItemConfiguracao icone="fa-bell" titulo="Notificações e e-mails" to="/perfil/configuracoes/notificacoes" />
      </GrupoConfiguracao>

      {adminAutorizado && (
        <GrupoConfiguracao
          admin
          titulo="Administração da plataforma · só para admins"
          descricao="Atalhos protegidos para operação e governança do ParaBook."
        >
          <ItemConfiguracao icone="fa-screwdriver-wrench" titulo="Django admin" estado="Acesso técnico auditável" to="/perfil/configuracoes/django-admin" />
          <ItemConfiguracao icone="fa-toggle-on" titulo="Feature flags" to="/perfil/configuracoes/feature-flags" />
          <ItemConfiguracao icone="fa-list-check" titulo="Trilha de auditoria" to="/perfil/configuracoes/auditoria" />
          <ItemConfiguracao icone="fa-credit-card" titulo="Planos e assinaturas" estado="Métricas financeiras em preparação" indisponivel />
        </GrupoConfiguracao>
      )}
    </div>
  );
}

export default ConfiguracoesAvancadas;
