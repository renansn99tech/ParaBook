import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import { obterCtaAutoria } from '../services/ctaAutoria';
import leitora768 from '../assets/img/leitora-768.webp';
import autor768 from '../assets/img/autor-768.webp';
import '../assets/css/experiencia-publica.css';

const CONTEUDOS = {
  leitores: {
    eyebrow: 'Experiência de leitura',
    titulo: 'Leia no seu ritmo e encontre novas vozes.',
    descricao: 'O ParaBook reúne acervo independente, estante pessoal e comunidades em uma jornada contínua.',
    imagem: leitora768,
    alt: 'Leitora usando o ParaBook em um tablet',
    beneficios: [
      ['fa-book-open', 'Leitura integrada', 'Abra obras disponíveis e acompanhe o progresso sem sair da plataforma.'],
      ['fa-bookmark', 'Estante pessoal', 'Organize o que deseja ler, o que está lendo e o que já concluiu.'],
      ['fa-star', 'Avaliações com contexto', 'Registre notas e resenhas para contribuir com outras escolhas.'],
      ['fa-people-group', 'Comunidades literárias', 'Participe de discussões e receba respostas às suas postagens.'],
      ['fa-chart-line', 'Jornada transparente', 'Acompanhe gêneros, avaliações e atividade no seu resumo privado.'],
      ['fa-shield-halved', 'Privacidade controlada', 'Escolha o que outras pessoas podem visualizar no seu perfil.'],
    ],
    passos: [
      ['Explore o acervo', 'Conheça obras publicadas e filtre por categorias.'],
      ['Monte sua estante', 'Salve uma obra e mantenha o progresso organizado.'],
      ['Continue a conversa', 'Avalie a leitura ou participe de uma comunidade.'],
    ],
  },
  autores: {
    eyebrow: 'Autoria independente',
    titulo: 'Apresente sua obra com clareza e construa relações com leitores.',
    descricao: 'O caminho de autoria combina perfil próprio, publicação moderada e espaços de conversa. Recursos futuros são identificados com transparência.',
    imagem: autor768,
    alt: 'Autor independente preparando uma obra no computador',
    beneficios: [
      ['fa-address-card', 'Identidade autoral', 'Depois da aprovação, seu perfil passa a apresentar você como Autor.'],
      ['fa-file-shield', 'Envio responsável', 'Obras passam por declarações de autoria, validação e moderação administrativa.'],
      ['fa-book-open-reader', 'Presença no acervo', 'Publicações aprovadas ganham uma página de leitura e descoberta.'],
      ['fa-comments', 'Feedback da comunidade', 'Avaliações, resenhas e respostas ajudam a compreender a recepção da obra.'],
      ['fa-users', 'Comunidades', 'Converse sobre gêneros, temas e processos criativos com outros participantes.'],
      ['fa-chart-simple', 'Analytics do Autor', 'Painel analítico aprofundado planejado para uma etapa futura.', 'Em breve'],
    ],
    passos: [
      ['Crie sua conta de leitor', 'Toda jornada de autoria começa com uma conta regular e termos aceitos.'],
      ['Solicite o perfil de autor', 'A administração analisa o pedido antes de liberar a publicação.'],
      ['Envie a obra para moderação', 'Somente autores aprovados e administradores acessam o formulário de envio.'],
    ],
  },
};

function ExperienciaPublica({ publico }) {
  const { user } = useContext(AuthContext);
  const conteudo = CONTEUDOS[publico];
  const autoriaCta = obterCtaAutoria(user);
  const principal = publico === 'leitores'
    ? (user
      ? { to: '/minha-biblioteca', label: 'Abrir minha estante', icon: 'fa-book-bookmark' }
      : { to: '/biblioteca', label: 'Explorar o acervo', icon: 'fa-book-open' })
    : autoriaCta;
  const secundaria = publico === 'leitores'
    ? { to: '/comunidades', label: 'Explorar comunidades' }
    : { to: '/diretrizes', label: 'Ler diretrizes' };
  const final = publico === 'leitores'
    ? (user
      ? { to: '/perfil', label: 'Ver minha jornada', icon: 'fa-chart-line' }
      : { to: '/register', label: 'Criar conta gratuita', icon: 'fa-user-plus' })
    : { to: '/autores', label: 'Conhecer autores da plataforma', icon: 'fa-people-group' };

  return (
    <main className={`experiencia-page experiencia-page--${publico}`}>
      <section className="experiencia-hero" aria-labelledby="experiencia-title">
        <div className="experiencia-hero-copy">
          <p className="experiencia-eyebrow">{conteudo.eyebrow}</p>
          <h1 id="experiencia-title">{conteudo.titulo}</h1>
          <p>{conteudo.descricao}</p>
          <div className="experiencia-actions">
            <Link to={principal.to} className="experiencia-primary"><i className={`fa-solid ${principal.icon}`} aria-hidden="true"></i>{principal.label}</Link>
            <Link to={secundaria.to} className="experiencia-secondary">{secundaria.label}</Link>
          </div>
        </div>
        <div className="experiencia-hero-media">
          <img src={conteudo.imagem} alt={conteudo.alt} width="768" height="614" />
        </div>
      </section>

      <section className="experiencia-beneficios" aria-labelledby="beneficios-title">
        <div className="experiencia-heading">
          <p className="experiencia-eyebrow">O que você encontra</p>
          <h2 id="beneficios-title">Recursos que já fazem parte do ParaBook</h2>
        </div>
        <div className="experiencia-grid">
          {conteudo.beneficios.map(([icone, titulo, descricao, status]) => (
            <article key={titulo}>
              <span className="experiencia-icon"><i className={`fa-solid ${icone}`} aria-hidden="true"></i></span>
              <div className="experiencia-card-title"><h3>{titulo}</h3>{status && <span>{status}</span>}</div>
              <p>{descricao}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="experiencia-passos" aria-labelledby="passos-title">
        <div className="experiencia-heading">
          <p className="experiencia-eyebrow">Como funciona</p>
          <h2 id="passos-title">Um caminho simples e verificável</h2>
        </div>
        <ol>
          {conteudo.passos.map(([titulo, descricao], index) => (
            <li key={titulo}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{titulo}</h3><p>{descricao}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="experiencia-final" aria-labelledby="experiencia-final-title">
        <div>
          <p className="experiencia-eyebrow">Seu próximo passo</p>
          <h2 id="experiencia-final-title">{publico === 'leitores' ? 'Encontre uma leitura que mereça seu tempo.' : 'Avance apenas pela etapa disponível para sua conta.'}</h2>
        </div>
        <Link to={final.to} className="experiencia-primary"><i className={`fa-solid ${final.icon}`} aria-hidden="true"></i>{final.label}</Link>
      </section>
    </main>
  );
}

export default ExperienciaPublica;
