import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/diretrizes.css';

const VERSAO_PADRAO = '2026-09-30';

const MAPA_PRIVACIDADE = [
  {
    categoria: 'Conta e autenticação',
    exemplos: 'Nome, e-mail, credenciais protegidas, sessões, aceite e papel da conta.',
    finalidade: 'Criar e proteger a conta, autenticar o usuário e prestar o serviço solicitado.',
    fundamento: 'Execução do serviço, segurança, cumprimento de obrigação e exercício de direitos.',
    retencao: 'Enquanto a conta estiver ativa e, após o encerramento, somente pelo prazo necessário às finalidades legalmente justificadas.',
  },
  {
    categoria: 'Elegibilidade etária',
    exemplos: 'Data de nascimento privada, faixa etária, estado da conta e eventos de revisão.',
    finalidade: 'Restringir o serviço a maiores de 18 anos enquanto não houver modalidade adolescente aprovada.',
    fundamento: 'Proteção do titular, segurança e cumprimento das regras de acesso vigentes.',
    retencao: 'Durante a conta ativa; evidências mínimas seguem a política de retenção aplicável e revisão periódica.',
  },
  {
    categoria: 'Perfil, leitura e comunidade',
    exemplos: 'Perfil, estante, progresso, avaliações, resenhas, comunidades, postagens e respostas.',
    finalidade: 'Oferecer recursos sociais, de catálogo, leitura e recomendação heurística.',
    fundamento: 'Execução do serviço e interesses legítimos documentados, com respeito às preferências de privacidade.',
    retencao: 'Enquanto a conta ou o conteúdo estiver ativo, ressalvadas exclusão, anonimização e evidências justificadas.',
  },
  {
    categoria: 'Publicação e moderação',
    exemplos: 'Obras, capas, PDFs, declarações, protocolos, denúncias, decisões e recursos.',
    finalidade: 'Receber obras, controlar acesso, proteger direitos e aplicar as regras da comunidade.',
    fundamento: 'Execução do serviço, exercício regular de direitos, segurança e obrigações aplicáveis.',
    retencao: 'Durante a disponibilização e, depois, pelo período necessário a recursos, obrigações e defesa de direitos.',
  },
  {
    categoria: 'Suporte, privacidade e segurança',
    exemplos: 'Mensagens, protocolos, registros técnicos, auditoria, logs e informações mínimas de incidentes.',
    finalidade: 'Atender solicitações, prevenir abuso, investigar falhas e comprovar decisões.',
    fundamento: 'Cumprimento de obrigação, exercício de direitos, segurança e interesses legítimos documentados.',
    retencao: 'Pelo prazo necessário ao atendimento, à segurança e à preservação de evidências; backups seguem ciclo técnico restrito.',
  },
];

const FORNECEDORES_ATUAIS = [
  ['Render', 'Execução da API e processamento de registros técnicos necessários à operação, nos limites dos serviços contratados e de seus termos aplicáveis.'],
  ['Supabase', 'Banco de dados, armazenamento privado de mídia e cópias técnicas controladas, nos limites dos serviços contratados e de seus termos aplicáveis.'],
  ['Vercel', 'Entrega do cliente web e processamento de metadados técnicos de acesso, nos limites dos serviços contratados e de seus termos aplicáveis.'],
  ['Google (Gmail gratuito)', 'Recebimento e resposta das mensagens encaminhadas ao canal de privacidade. A versão gratuita segue os termos próprios do Google e não é apresentada pelo ParaBook como serviço de operador contratado.'],
];

const DOCUMENTOS = {
  termos: {
    numero: '01',
    titulo: 'Termos de Uso',
    resumo: 'Regras gerais para criação de conta e uso gratuito do ParaBook.',
    secoes: [
      ['Conta e acesso', 'A conta é pessoal e intransferível. Você deve fornecer dados verdadeiros, proteger suas credenciais e comunicar acessos indevidos. O ParaBook pode solicitar verificação proporcional de identidade quando necessária à segurança, à recuperação da conta ou ao exercício de direitos.'],
      ['Idade e Modo Restrito', 'A versão 2026-09-30 destina o cadastro e as áreas autenticadas a pessoas com 18 anos ou mais. Quando a política etária for ativada, uma declaração de menoridade ou a falta de regularização no prazo aplicável colocará a conta em Modo Restrito, preservando suporte, correção da declaração, exportação, exclusão, segurança e logout. Não haverá suspensão nem exclusão automática apenas por menoridade. A participação de adolescentes dependerá de nova versão, controles proporcionais e aprovação do Gate G2.'],
      ['Uso permitido', 'Você pode descobrir e ler obras disponibilizadas, manter sua estante, avaliar livros e participar de comunidades conforme as permissões da conta. É proibido violar direitos de terceiros, contornar controles de acesso, explorar falhas, automatizar abuso ou usar o serviço para atividade ilícita.'],
      ['Conteúdo do usuário', 'Você continua titular do conteúdo original que publica. Ao enviá-lo, concede somente as autorizações necessárias ao funcionamento, à segurança e à exibição do conteúdo dentro do serviço, nos limites do documento aplicável. O envio não transfere autoria nem permite exploração comercial independente pelo ParaBook.'],
      ['Encerramento e contexto de terceiros', 'A exclusão da conta remove ou anonimiza os dados e conteúdos conforme a natureza de cada registro. Uma contribuição poderá permanecer sem identificação quando isso for necessário para preservar direitos e conteúdos de outras pessoas ou a compreensão de uma conversa. Por exemplo, respostas publicadas por terceiros não serão apagadas apenas porque a mensagem que iniciou a conversa passou a identificar seu autor como “Usuário removido”. Evidências de segurança, moderação e exercício de direitos permanecem somente pelo período justificável na política de retenção.'],
      ['Moderação e suspensão', 'Conteúdo ou contas podem receber medida proporcional, registrada e motivada. Suspensões temporárias usam exclusivamente os prazos de 3, 7, 15 ou 30 dias. Quando cabível, a comunicação informa a regra aplicada, a medida e o canal de resposta ou recurso, sem afastar contenção imediata diante de risco relevante ou ordem válida.'],
      ['Serviço gratuito e recursos desligados', 'A operação vigente é gratuita. Pagamentos, publicidade, analytics externo, e-mail transacional e recuperação pública de senha permanecem desligados e não podem ser ativados sem avaliação, nova transparência e homologação aplicáveis.'],
      ['Disponibilidade e mudanças', 'O serviço pode evoluir, sofrer manutenção ou ter recursos alterados. Mudanças materiais no tratamento de dados, nas obrigações ou nas licenças recebem nova versão e exigem novo aceite antes da continuidade nas áreas autenticadas. Correções formais sem mudança material são registradas no histórico.'],
    ],
  },
  privacidade: {
    numero: '02',
    titulo: 'Política de Privacidade',
    resumo: 'Como o ParaBook trata dados pessoais e atende direitos previstos na LGPD.',
    secoes: [
      ['Princípios e alcance', 'O ParaBook limita o tratamento ao que é necessário para a operação gratuita vigente. Aceitar os Termos de Uso não significa consentir genericamente com todo tratamento: cada finalidade deve possuir fundamento adequado, e o consentimento será solicitado separadamente quando for a base aplicável.'],
      ['Compartilhamento e infraestrutura', 'Os fornecedores identificados nesta política executam operações técnicas necessárias à infraestrutura utilizada pelo ParaBook, conforme as configurações, finalidades e limites aplicáveis a cada serviço. Eles não representam o controlador, não adquirem autoria ou propriedade sobre obras e não recebem autorização para vender dados. Um fornecedor pode atuar como operador em certas atividades e como controlador independente em outras; a qualificação depende das decisões efetivamente tomadas e dos termos aplicáveis. Novos fornecedores somente poderão receber dados após avaliação prévia.'],
      ['Transferências internacionais', 'A infraestrutura pode envolver processamento fora do Brasil. Quando houver transferência internacional de dados pessoais, ela deverá observar mecanismo admitido pela LGPD, medidas de segurança e responsabilidades compatíveis com o papel efetivo de cada participante.'],
      ['Recursos atualmente desligados', 'Stripe, provedores SMTP, analytics externo e publicidade não integram o tratamento operacional atual. A ativação futura de qualquer desses recursos exigirá avaliação de necessidade, fornecedores, fundamento, retenção, segurança e atualização transparente desta política.'],
      ['Retenção e exclusão', 'Os critérios de retenção constam no mapa público abaixo. A exclusão da conta remove ou desvincula dados ativos conforme o fluxo aplicável, sem afastar retenções necessárias ao cumprimento de obrigação, prevenção a fraude, segurança ou exercício regular de direitos. Cópias residuais permanecem inacessíveis ao uso ordinário e são eliminadas ao final do ciclo técnico de backup aprovado.'],
      ['Direitos e atendimento', 'Você pode solicitar gratuitamente confirmação, acesso, correção, informação sobre compartilhamento, portabilidade quando aplicável, oposição, revogação de consentimento, eliminação nos limites legais e revisão de decisões unicamente automatizadas. O recebimento será confirmado em até cinco dias úteis, com protocolo no padrão PB-LGPD-AAAA-NNN e verificação proporcional de identidade. Confirmação e acesso simplificado serão providenciados imediatamente quando aplicável; a declaração completa será fornecida em até 15 dias, sem afastar outros prazos legais específicos.'],
      ['Segurança e incidentes', 'Aplicamos controles técnicos e organizacionais proporcionais ao risco. Incidentes que possam ocasionar risco ou dano relevante serão contidos, documentados, avaliados e comunicados aos titulares e à autoridade nos casos e prazos exigidos pela regulamentação.'],
    ],
  },
  publicacao: {
    numero: '03',
    titulo: 'Termos de Publicação e Licença',
    resumo: 'Condições específicas para autores enviarem obras ao catálogo gratuito.',
    secoes: [
      ['Declaração de legitimidade', 'Ao enviar uma obra, você declara ser titular dos direitos necessários ou possuir autorização válida para publicá-la. O envio não transfere titularidade nem autoria ao ParaBook, e a aprovação administrativa não certifica a autoria declarada.'],
      ['Licença concedida', 'Você concede licença mundial, não exclusiva, gratuita e revogável, limitada a armazenar, reproduzir tecnicamente, transmitir e exibir a obra dentro do ParaBook para leitura digital gratuita. O alcance mundial permite a operação da internet e da infraestrutura técnica; não autoriza venda, edição criativa, sublicenciamento comercial independente ou exploração fora das funcionalidades informadas.'],
      ['Processamento por fornecedores técnicos', 'Fornecedores de infraestrutura podem executar operações técnicas como armazenar cópias, processar metadados, controlar acesso, transmitir o arquivo ao leitor autorizado e manter backups restritos, conforme as configurações, finalidades e limites do serviço utilizado pelo ParaBook. Isso não significa representar o controlador e não lhes concede autoria, propriedade, poder de venda ou autorização para publicar a obra em nome próprio.'],
      ['Duração e retirada', 'A licença vigora enquanto a obra estiver disponibilizada. A retirada autônoma de obra própria interrompe imediatamente novos acessos ao arquivo e remove a obra do catálogo ativo. Resenhas e avaliações produzidas por outros usuários poderão permanecer porque constituem conteúdo próprio desses terceiros; nesse caso, serão vinculadas apenas a um registro neutro de “obra indisponível”, sem acesso ao arquivo e com anonimização ou remoção dos dados do autor retirante quando não houver fundamento para mantê-los. Evidências de aceite, moderação, recurso e exercício de direitos, assim como cópias técnicas temporárias, serão preservadas somente quando necessárias e pelo período justificável. Pedidos enviados ao canal externo recebem protocolo e seguem a prioridade aplicável, com informação do prazo estimado quando exigirem análise.'],
      ['Moderação editorial', 'Toda submissão permanece pendente até decisão administrativa de moderador autorizado no Dashboard. A revisão considera integridade, metadados, segurança, adequação às diretrizes e direitos autorais. Uma medida cautelar poderá restringir acesso diante de risco relevante, sem presumir decisão definitiva.'],
      ['Denúncia e recurso', 'A pessoa afetada será informada do motivo e poderá apresentar esclarecimentos, contranotificação ou recurso quando isso não comprometer investigação, ordem válida ou prevenção de dano urgente. Protocolo, prioridade e prazos seguem a Política de Direitos Autorais e as Diretrizes da Comunidade.'],
    ],
  },
  direitos: {
    numero: '04',
    titulo: 'Direitos Autorais e Denúncias',
    resumo: 'Procedimento para comunicar possível violação e contestar uma medida.',
    secoes: [
      ['Como denunciar', 'Qualquer pessoa poderá enviar alerta anônimo com a localização do conteúdo e os fatos essenciais. Para instaurar uma notificação autoral formal, o denunciante deverá informar a obra ou conteúdo, o direito alegadamente violado, sua relação com esse direito, as evidências estritamente necessárias e um meio de contato verificável. Denúncias deliberadamente falsas podem gerar responsabilização.'],
      ['Protocolo e prioridades', 'O sistema ou o canal disponível registra protocolo imediato. P0 abrange risco imediato e recebe confirmação humana e triagem em até 6 horas; P1 abrange risco grave e recebe confirmação e triagem em até 1 dia útil; P2 reúne os demais casos e recebe confirmação e triagem em até 3 dias úteis, dentro do horário de atendimento divulgado.'],
      ['Análise e decisão', 'A equipe preserva evidências pertinentes, avalia contexto, urgência e proporcionalidade e poderá restringir cautelarmente o conteúdo. A decisão fundamentada é prevista em até 7 dias úteis para P0/P1 e até 15 dias úteis para P2, ressalvadas diligências necessárias, ordens válidas e impedimentos que serão comunicados quando possível.'],
      ['Resposta, recurso e confidencialidade', 'A pessoa afetada poderá responder, apresentar documentação e recorrer quando cabível. A comunicação indicará a regra aplicada, o fato resumido, as evidências necessárias à defesa, a medida, sua duração quando houver e o canal de revisão. A identidade e os dados de contato do denunciante não serão revelados à pessoa denunciada por padrão. Qualquer revelação dependerá de obrigação legal, ordem válida ou necessidade estritamente demonstrada para o exercício de defesa, será limitada ao mínimo necessário, registrada pela administração e, quando juridicamente possível, previamente comunicada ao denunciante.'],
      ['Autoridades e dados', 'Dados pessoais e registros somente serão fornecidos a autoridades quando houver fundamento e solicitação válida quanto à autenticidade, competência e escopo. Pedidos excessivos ou incompatíveis serão limitados ou contestados quando juridicamente cabível.'],
    ],
  },
};

function TabelaPrivacidade() {
  return (
    <div className="legal-table-wrap" tabIndex="0" role="region" aria-label="Mapa resumido de tratamento de dados">
      <table className="legal-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Dados e finalidade</th>
            <th>Fundamento</th>
            <th>Retenção</th>
          </tr>
        </thead>
        <tbody>
          {MAPA_PRIVACIDADE.map((item) => (
            <tr key={item.categoria}>
              <th scope="row">{item.categoria}</th>
              <td><strong>{item.exemplos}</strong> {item.finalidade}</td>
              <td>{item.fundamento}</td>
              <td>{item.retencao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
          Versão do pacote: {governanca?.versao_termos || VERSAO_PADRAO}
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
            <strong>Minuta revisada para aprovação do controlador.</strong>
            <span>A identificação final, o registro de aprovação e a publicação controlada ainda precisam ser concluídos.</span>
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

        {documento === 'privacidade' && (
          <>
            <article className="glass-rule-card" data-revelar>
              <div className="rule-number">02A</div>
              <div className="card-legal-content">
                <h2>Mapa resumido de tratamento</h2>
                <p>Este quadro oferece transparência pública e não substitui o inventário interno, o RIPD ou a tabela de retenção detalhada do Gate G5.</p>
                <TabelaPrivacidade />
              </div>
            </article>

            <article className="glass-rule-card" data-revelar>
              <div className="rule-number">02B</div>
              <div className="card-legal-content">
                <h2>Fornecedores de infraestrutura utilizados atualmente</h2>
                <ul>
                  {FORNECEDORES_ATUAIS.map(([nome, finalidade]) => (
                    <li key={nome}><strong>{nome}:</strong> {finalidade}</li>
                  ))}
                </ul>
                <p>Pagamentos, SMTP, analytics externo e publicidade permanecem desligados nesta versão.</p>
              </div>
            </article>
          </>
        )}

        <article className="glass-rule-card" data-revelar>
          <div className="rule-number"><i className="fa-solid fa-address-card" aria-hidden="true"></i></div>
          <div className="card-legal-content">
            <h2>Controlador e contato</h2>
            {controladorCompleto ? (
              <p>
                <strong>{governanca.controlador.nome}</strong>, pessoa natural responsável pelas decisões sobre o tratamento de dados pessoais realizado no projeto ParaBook.{' '}
                Localidade: {governanca.controlador.endereco}. Canal de privacidade:{' '}
                <a href={`mailto:${governanca.controlador.contato_privacidade}`}>{governanca.controlador.contato_privacidade}</a>.
              </p>
            ) : (
              <p>A identificação pública definitiva do controlador e o canal de privacidade serão exibidos após a aprovação e antes da abertura em produção.</p>
            )}
            <p>Jurisdição: {governanca?.jurisdicao || 'Brasil'}. O documento civil do controlador não é publicado nesta interface.</p>
          </div>
        </article>
      </div>
    </main>
  );
}

export default DocumentoLegal;
