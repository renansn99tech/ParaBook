import '../assets/css/backlog.css';

function Backlog() {
  return (
    <main className="backlog-page-main" id="topo" style={{ paddingTop: '80px' }}>
      <section className="news-hero-section">
        <div className="scroll-ticker-container">
          <span className="ticker-item">
            NOVIDADES • ROADMAP • CHANGELOG • NOVIDADES • ROADMAP • CHANGELOG •
          </span>
        </div>

        <div className="news-intro-content">
          <h1 className="gradient-text">A Evolução do ParaBook</h1>
          <p>Acompanhe a nossa jornada: de um projeto acadêmico a uma plataforma literária moderna e escalável.</p>
        </div>
      </section>

      <section className="timeline-container">
        <div className="timeline-vertical-bar"></div>

        <article className="timeline-entry inverse">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Mar 2026</span>
              <span className="status-badge">SENAC / GitHub</span>
            </div>
            <h3>Kick-off e Repositório</h3>
            <p>Primeira reunião de brainstorming, definição do nicho do projeto integrador e primeiro push oficial no GitHub.</p>
          </div>
        </article>

        <article className="timeline-entry">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Abr 2026</span>
              <span className="status-badge">Design</span>
            </div>
            <h3>Identidade Visual Inicial</h3>
            <p>Definição da primeira paleta de cores futurista e concepção do layout original da biblioteca digital.</p>
          </div>
        </article>

        <article className="timeline-entry inverse">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Abr 2026</span>
              <span className="status-badge">Backend</span>
            </div>
            <h3>Estrutura de Dados</h3>
            <p>Finalização da modelagem inicial de banco de dados relacional e integração das primeiras estruturas em Django.</p>
          </div>
        </article>

        <article className="timeline-entry">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span class="date-tag">Mai 2026</span>
              <span class="status-badge">Deploy</span>
            </div>
            <h3>Publicação no GitHub Pages</h3>
            <p>Primeiro deploy público do protótipo estático para testes e demonstração estrutural inicial.</p>
          </div>
        </article>

        <article className="timeline-entry inverse">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Mai 2026</span>
              <span className="status-badge">UI/UX</span>
            </div>
            <h3>Modernização Visual</h3>
            <p>Implementação do novo sistema visual focado em experiência de usuário (UX), responsividade inicial e performance de front-end.</p>
          </div>
        </article>

        <article className="timeline-entry">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Jun 2026</span>
              <span className="status-badge">Admin</span>
            </div>
            <h3>Dashboard SPA & Permissões</h3>
            <p>Criação do painel de controle em Single Page Application, com gráficos dinâmicos e aprovação modular de obras e autores.</p>
          </div>
        </article>

        <article className="timeline-entry inverse">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Jun 2026</span>
              <span className="status-badge">Features</span>
            </div>
            <h3>Perfis Dinâmicos e Autores</h3>
            <p>Refatoração do sistema de contas. Usuários agora atualizam imagens de perfil, gerenciam configurações e solicitam status de "Autor Independente".</p>
          </div>
        </article>

        <article className="timeline-entry">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Jun 2026</span>
              <span className="status-badge">Rebranding</span>
            </div>
            <h3>A Nova Face do ParaBook</h3>
            <p>Transição de nível Sênior para a arquitetura "Neon Glassmorphism". Adoção de tons de azul profundo e interfaces de vidro para criar imersão focada e madura.</p>
          </div>
        </article>

        <article className="timeline-entry inverse">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Jun 2026</span>
              <span className="status-badge">SecOps</span>
            </div>
            <h3>Segurança Avançada e UX</h3>
            <p>Implementação do fluxo nativo de Recuperação de Senha, eixos de sincronização assíncrona e notificações não obstrusivas via SweetAlert.</p>
          </div>
        </article>
        
        {/* NOVOS CARDS DE JULHO */}
        <article className="timeline-entry">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Jul 2026</span>
              <span className="status-badge">API-First</span>
            </div>
            <h3>Implementação Fases 1 e 2</h3>
            <p>Criação da camada de API REST no Django (Fase 1) e integração de autenticação via JWT com o novo frontend React (Fase 2), concluindo a fundação para o novo ecossistema.</p>
          </div>
        </article>

        <article className="timeline-entry inverse">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Jul 2026</span>
              <span className="status-badge">DevOps</span>
            </div>
            <h3>Conteinerização com Docker</h3>
            <p>Configuração do Docker Compose unificando os contêineres do Django, PostgreSQL e Redis, criando um ambiente de desenvolvimento robusto e isolado a partir do dia 16/07.</p>
          </div>
        </article>

        <article className="timeline-entry current-milestone">
          <div className="timeline-pointer"></div>
          <div className="glass-card-news">
            <div className="card-header">
              <span className="date-tag">Jul 2026</span>
              <span className="status-badge">Frontend Moderno</span>
            </div>
            <h3>Refatoração para React SPA</h3>
            <p>A grande virada: transição de todos os templates estáticos do Django para componentes React, aproveitando o design Neon Glassmorphism em uma Single Page Application extremamente veloz.</p>
          </div>
        </article>

      </section>
    </main>
  );
}

export default Backlog;
