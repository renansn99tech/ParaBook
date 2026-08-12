import { Link } from 'react-router-dom';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/sobre.css';

function Sobre() {
  const paginaRef = useRevelacao([]);

  return (
    <main className="perfil-page" ref={paginaRef}>
      <section className="sobre-conteudo">
        <article className="fade-section" data-revelar>
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

        <article className="about-split-section" data-revelar>
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
          <h2 className="timeline-title" data-revelar>Roadmap Evolutivo</h2>
          <div className="sobre-timeline-container">

            <div className="timeline-item done" data-revelar>
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="marco-cabecalho">
                  <span className="date">MARÇO 2026</span>
                  <span className="badge-roadmap badge-done">Concluído</span>
                </div>
                <h3>Arquitetura Base</h3>
                <p>Definição do modelo relacional, fundação estética e versionamento no repositório GitHub.</p>
              </div>
            </div>

            <div className="timeline-item done" data-revelar>
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="marco-cabecalho">
                  <span className="date">JUNHO 2026</span>
                  <span className="badge-roadmap badge-done">Concluído</span>
                </div>
                <h3>Ecossistema Integrado</h3>
                <p>Lançamento do Dashboard Administrativo e fluxo completo de aprovação de contas para Autores
                  Independentes.</p>
              </div>
            </div>

            <div className="timeline-item done" data-revelar>
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="marco-cabecalho">
                  <span className="date">JULHO 2026</span>
                  <span className="badge-roadmap badge-done">Concluído</span>
                </div>
                <h3>APIs e Inovações</h3>
                <p>Implementação de APIs externas e funcionalidades diferenciais para enriquecer a experiência
                  literária na plataforma.</p>
              </div>
            </div>

            <div className="timeline-item active" data-revelar>
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="marco-cabecalho">
                  <span className="date">AGOSTO 2026</span>
                  <span className="badge-roadmap badge-active"><i className="fa-solid fa-spinner fa-spin-pulse"></i> Em
                    Andamento</span>
                </div>
                <h3>Comunidades Interconectadas</h3>
                <p>Fóruns e espaços de debate dinâmicos integrados de forma nativa aos tipos de usuários (Leitores e
                  Autores).</p>
              </div>
            </div>

            <div className="timeline-item future" data-revelar>
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="marco-cabecalho">
                  <span className="date">SETEMBRO 2026</span>
                  <span className="badge-roadmap badge-future">Em Breve</span>
                </div>
                <h3>Feira do Livro & Expansão</h3>
                <p>Foco total em presença digital, integrações com redes sociais e marketing para a apresentação
                  oficial do projeto na Feira do Livro.</p>
              </div>
            </div>

          </div>
        </article>

        <div className="sobre-rodape" data-revelar>
          <Link to="/backlog" className="btn-outline">
            <i className="fa-solid fa-code-branch"></i> Ver Backlog Técnico do Projeto
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Sobre;
