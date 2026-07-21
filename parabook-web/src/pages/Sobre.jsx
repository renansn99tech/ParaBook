import { Link } from 'react-router-dom';
import '../assets/css/sobre.css';

function Sobre() {
  return (
    <main className="perfil-page">
      <section className="sobre-conteudo" style={{ margin: '0 auto', maxWidth: '1400px' }}>
        <article className="fade-section">
          <h2>Nossa Visão</h2>
          <p>
            O ParaBook nasceu para ser a infraestrutura definitiva de leitura digital. Nossa missão é democratizar o
            acesso ao conhecimento, oferecendo uma experiência de leitura imersiva, performática e livre de distrações,
            integrando o usuário em um ecossistema literário vivo.
            <br /><br />
            <strong>Por exemplo:</strong> Um leitor pode mergulhar em um clássico de domínio público, salvar seus
            trechos favoritos e debater interpretações em tempo real com outros entusiastas diretamente pela plataforma.
          </p>
        </article>

        <article className="about-split-section">
          <div className="about-container">
            <div className="about-text">
              <h2 className="gradient-text">O Futuro do ParaBook</h2>
              <p>
                Estamos evoluindo de uma biblioteca digital para uma <strong>plataforma de economia criativa
                  literária escalável</strong>. Nos próximos meses, o ParaBook passará por uma grande
                transformação arquitetural: o <strong>desacoplamento do backend via Django REST Framework</strong>.
                Isso nos permitirá atuar como um ecossistema "API-First", preparando nossa infraestrutura para
                suportar um alto volume de acessos e pavimentando o caminho para nossos futuros aplicativos mobile.
                <br /><br />
                <strong>Na prática:</strong> Essa evolução garante não apenas altíssima performance e segurança na
                transição de dados, mas também permite que novos serviços — como o nosso vindouro <strong> Marketplace de troca de livros físicos</strong> — sejam integrados de forma fluida e
                descentralizada.
              </p>
              <div className="tech-tags">
                <span>Django REST</span>
                <span>API-First</span>
                <span>React</span>
                <span>Flutter</span>
                <span>Scalability</span>
              </div>
            </div>
            <div className="about-visual">
              <div className="floating-circle"></div>
            </div>
          </div>
        </article>

        <article className="fade-section">
          <h2 className="timeline-title">Roadmap Evolutivo</h2>
          <div className="sobre-timeline-container">

            <div className="timeline-item done">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="date" style={{ marginBottom: 0 }}>MARÇO 2026</span>
                  <span className="badge-roadmap badge-done">Concluído</span>
                </div>
                <h3>Arquitetura Base</h3>
                <p>Definição do modelo relacional, fundação estética e versionamento no repositório GitHub.</p>
              </div>
            </div>

            <div className="timeline-item done">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="date" style={{ marginBottom: 0 }}>JUNHO 2026</span>
                  <span className="badge-roadmap badge-done">Concluído</span>
                </div>
                <h3>Ecossistema Integrado</h3>
                <p>Lançamento do Dashboard Administrativo e fluxo completo de aprovação de contas para Autores
                  Independentes.</p>
              </div>
            </div>

            <div className="timeline-item active">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="date" style={{ marginBottom: 0, color: '#d8b4fe' }}>JULHO 2026</span>
                  <span className="badge-roadmap badge-active"><i className="fa-solid fa-spinner fa-spin-pulse"></i> Em
                    Andamento</span>
                </div>
                <h3 style={{ color: '#c4b5fd' }}>APIs e Inovações</h3>
                <p>Implementação de APIs externas e funcionalidades diferenciais para enriquecer a experiência
                  literária na plataforma.</p>
              </div>
            </div>

            <div className="timeline-item future">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="date" style={{ marginBottom: 0 }}>AGOSTO 2026</span>
                  <span className="badge-roadmap badge-future">Em Breve</span>
                </div>
                <h3>Comunidades Interconectadas</h3>
                <p>Fóruns e espaços de debate dinâmicos integrados de forma nativa aos tipos de usuários (Leitores e
                  Autores).</p>
              </div>
            </div>

            <div className="timeline-item future">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="date" style={{ marginBottom: 0 }}>SETEMBRO 2026</span>
                  <span className="badge-roadmap badge-future">Em Breve</span>
                </div>
                <h3>Feira do Livro & Expansão</h3>
                <p>Foco total em presença digital, integrações com redes sociais e marketing para a apresentação
                  oficial do projeto na Feira do Livro.</p>
              </div>
            </div>

          </div>
        </article>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link to="/backlog" className="btn-outline"
            style={{ padding: '12px 24px', borderRadius: '12px', color: '#c4b5fd', borderColor: 'rgba(139,92,246,0.3)', textDecoration: 'none' }}>
            <i className="fa-solid fa-code-branch"></i> Ver Backlog Técnico do Projeto
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Sobre;
