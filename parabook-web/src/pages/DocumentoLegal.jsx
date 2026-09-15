import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/diretrizes.css';

const DOCUMENTOS = {
  termos: {
    numero: '01',
    titulo: 'Termos de Uso',
    resumo: 'Regras gerais para criação de conta e uso gratuito do ParaBook.',
    secoes: [
      ['Conta e acesso', 'A conta é pessoal e intransferível. Você deve fornecer dados verdadeiros, proteger suas credenciais e comunicar acessos indevidos. O ParaBook pode exigir confirmação de identidade quando necessária à segurança ou ao exercício de direitos.'],
      ['Idade e capacidade', 'A política de participação de adolescentes ainda está em avaliação jurídica e de produto. O ParaBook estudará a possibilidade de aceitar usuários a partir de 14 anos, mas não abrirá esse público nem afirmará uma idade mínima definitiva antes de aprovar controles proporcionais, transparência adequada e regras de participação do responsável quando aplicáveis.'],
      ['Uso permitido', 'Você pode descobrir e ler obras disponibilizadas, manter sua estante, avaliar livros e participar de comunidades. É proibido violar direitos de terceiros, contornar controles de acesso, explorar falhas, automatizar abuso ou usar o serviço para atividade ilícita.'],
      ['Conteúdo do usuário', 'Você continua titular do conteúdo original que publica. Ao enviá-lo, concede licença não exclusiva, gratuita e limitada ao funcionamento, à segurança e à divulgação interna do serviço, enquanto o conteúdo estiver disponível, ressalvadas cópias técnicas e retenções legalmente justificadas.'],
      ['Moderação e suspensão', 'Conteúdo ou contas podem ser moderados com registro do motivo e medida proporcional. Suspensões temporárias usam exclusivamente os prazos de 3, 7, 15 ou 30 dias. Quando cabível, o usuário poderá apresentar esclarecimentos ou recurso pelos canais disponibilizados.'],
      ['Disponibilidade e mudanças', 'O serviço gratuito pode evoluir, sofrer manutenção ou ter recursos alterados. Mudanças materiais deste pacote recebem nova versão e exigem novo aceite antes do uso das áreas autenticadas.'],
    ],
  },
  privacidade: {
    numero: '02',
    titulo: 'Política de Privacidade',
    resumo: 'Como o ParaBook trata dados pessoais e atende direitos previstos na LGPD.',
    secoes: [
      ['Dados tratados', 'Tratamos dados de cadastro, autenticação, perfil, estante e leitura, avaliações, publicações, comunidades, preferências, solicitações de suporte e registros técnicos de segurança. Dados não necessários ao serviço não devem ser solicitados.'],
      ['Finalidades e bases legais', 'Os dados são usados para executar o serviço solicitado, proteger contas e a plataforma, cumprir obrigações legais, exercer direitos e atender interesses legítimos documentados, sempre com avaliação de necessidade e dos direitos do titular. Consentimento será solicitado quando essa for a base adequada.'],
      ['Compartilhamento e infraestrutura', 'Dados podem ser processados por fornecedores de hospedagem, banco, armazenamento e monitoramento estritamente necessários à operação. Transferências internacionais, quando existentes, dependem de mecanismo admitido pela LGPD e salvaguardas compatíveis. Não vendemos dados pessoais.'],
      ['Retenção e exclusão', 'Mantemos dados pelo tempo necessário às finalidades informadas. A exclusão da conta remove dados ativos vinculados, sem afastar retenções exigidas por lei, prevenção a fraude, exercício regular de direitos e ciclos técnicos de backup com acesso restrito.'],
      ['Direitos do titular', 'Você pode pedir confirmação, acesso, correção, informação sobre compartilhamento, portabilidade quando aplicável, oposição e eliminação nos limites da LGPD. Também pode solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado, quando aplicável. Solicitações devem ser encaminhadas ao canal público de privacidade exibido nesta página.'],
      ['Segurança e incidentes', 'Aplicamos controles técnicos e organizacionais proporcionais ao risco. Incidentes que possam ocasionar risco ou dano relevante serão avaliados, contidos, documentados e comunicados aos titulares e à autoridade nos casos e prazos exigidos pela legislação.'],
    ],
  },
  publicacao: {
    numero: '03',
    titulo: 'Termos de Publicação e Licença',
    resumo: 'Condições específicas para autores enviarem obras ao catálogo gratuito.',
    secoes: [
      ['Declaração de legitimidade', 'Ao enviar uma obra, você declara ser titular dos direitos necessários ou possuir autorização válida para publicá-la. O envio não transfere a titularidade ao ParaBook.'],
      ['Licença concedida', 'Você concede ao ParaBook licença não exclusiva, gratuita e revogável, limitada a armazenar, reproduzir tecnicamente, transmitir e exibir a obra dentro do serviço para leitura digital gratuita. A licença não autoriza venda, sublicenciamento comercial independente ou exploração fora das funcionalidades informadas.'],
      ['Duração e retirada', 'A licença vigora enquanto a obra estiver disponibilizada. Um pedido de retirada encerra novas disponibilizações após processamento razoável, preservadas cópias técnicas temporárias, evidências de aceite e retenções necessárias ao cumprimento legal ou exercício de direitos.'],
      ['Moderação editorial', 'Toda submissão permanece pendente até decisão administrativa de um moderador autorizado no Dashboard. A revisão considera integridade, metadados, segurança, adequação às diretrizes e direitos autorais. A aprovação não representa certificação de autoria nem afasta a responsabilidade de quem enviou o conteúdo.'],
      ['Denúncia e recurso', 'Uma denúncia pode provocar restrição cautelar proporcional ao risco. O autor será informado do motivo e poderá apresentar esclarecimentos ou recurso quando isso não comprometer investigação, ordem válida ou prevenção de dano urgente.'],
    ],
  },
  direitos: {
    numero: '04',
    titulo: 'Direitos Autorais e Denúncias',
    resumo: 'Procedimento para comunicar possível violação e contestar uma medida.',
    secoes: [
      ['Como denunciar', 'Informe a obra ou conteúdo, identifique o direito alegadamente violado, descreva os fatos e forneça um meio de contato. Envie somente dados e evidências necessários; denúncias deliberadamente falsas podem gerar responsabilização.'],
      ['Análise', 'A equipe registra protocolo, preserva evidências pertinentes e avalia contexto, urgência e proporcionalidade. O conteúdo pode ser restringido cautelarmente quando houver risco relevante, sem presumir decisão definitiva.'],
      ['Resposta e recurso', 'A pessoa afetada poderá responder e apresentar documentação. A decisão e sua justificativa serão registradas, com possibilidade de revisão nos casos previstos pelo processo de moderação.'],
      ['Autoridades e dados', 'Dados pessoais e registros somente serão fornecidos a autoridades quando houver base legal e solicitação válida. Pedidos excessivos ou incompatíveis serão contestados quando juridicamente cabível.'],
    ],
  },
};

function DocumentoLegal({ documento }) {
  const paginaRef = useRevelacao([documento]);
  const [governanca, setGovernanca] = useState(null);
  const conteudo = DOCUMENTOS[documento];

  useEffect(() => {
    api.get('/auth/governanca/')
      .then(({ data }) => setGovernanca(data))
      .catch(() => setGovernanca(null));
  }, []);

  if (!conteudo) return <Navigate to="/diretrizes" replace />;

  const controladorCompleto = governanca?.controlador?.identificacao_completa;

  return (
    <main className="guidelines-main" ref={paginaRef}>
      <header className="hero-guidelines" data-revelar>
        <span className="guidelines-kicker">Documento {conteudo.numero}</span>
        <h1 className="gradient-text">{conteudo.titulo}</h1>
        <p className="guidelines-lead">{conteudo.resumo}</p>
        <small className="guidelines-updated">
          Versão do pacote: {governanca?.versao_termos || '2026-09-09'}
        </small>
      </header>

      <nav className="guidelines-nav" aria-label="Documentos legais" data-revelar>
        <Link to="/termos">Termos</Link>
        <Link to="/privacidade">Privacidade</Link>
        <Link to="/publicacao-e-licenca">Publicação</Link>
        <Link to="/direitos-autorais">Direitos autorais</Link>
        <Link to="/diretrizes">Comunidade</Link>
      </nav>

      <div className="guidelines-container" data-revelar-cascata>
        {!governanca?.pronto_para_publicacao && (
          <aside className="guidelines-status" role="status" data-revelar>
            <strong>Documento em preparação para o lançamento público.</strong>
            <span>A identificação final do controlador e a revisão jurídica ainda precisam ser aprovadas.</span>
          </aside>
        )}

        <article className="glass-rule-card" data-revelar>
          <div className="rule-number">{conteudo.numero}</div>
          <div className="card-legal-content">
            {conteudo.secoes.map(([titulo, texto]) => (
              <section key={titulo}>
                <h2>{titulo}</h2>
                <p>{texto}</p>
              </section>
            ))}
          </div>
        </article>

        <article className="glass-rule-card" data-revelar>
          <div className="rule-number"><i className="fa-solid fa-address-card" aria-hidden="true"></i></div>
          <div className="card-legal-content">
            <h2>Controlador e contato</h2>
            {controladorCompleto ? (
              <p>
                <strong>{governanca.controlador.nome}</strong> ({governanca.controlador.tipo === 'pessoa_fisica' ? 'pessoa física' : 'pessoa jurídica'}).{' '}
                Endereço: {governanca.controlador.endereco}. Canal de privacidade: {governanca.controlador.contato_privacidade}.
              </p>
            ) : (
              <p>Os dados públicos definitivos do controlador e o canal de privacidade serão exibidos antes da abertura em produção.</p>
            )}
            <p>Jurisdição: {governanca?.jurisdicao || 'Brasil'}. O documento civil do controlador não é publicado nesta interface.</p>
          </div>
        </article>
      </div>
    </main>
  );
}

export default DocumentoLegal;
