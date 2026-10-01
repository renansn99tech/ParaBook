import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useRevelacao from '../hooks/useRevelacao';
import api from '../services/api';
import '../assets/css/diretrizes.css';

const VERSAO_PADRAO = '2026-09-30';

function Diretrizes() {
  const paginaRef = useRevelacao([]);
  const [governanca, setGovernanca] = useState(null);

  useEffect(() => {
    api.get('/auth/governanca/')
      .then(({ data }) => setGovernanca(data))
      .catch(() => setGovernanca(null));
  }, []);

  return (
    <main className="guidelines-main" ref={paginaRef}>
      <header className="hero-guidelines" data-revelar>
        <span className="guidelines-kicker">Documento 05</span>
        <h1 className="gradient-text">Diretrizes da Comunidade</h1>
        <p className="guidelines-lead">
          Regras de convivência, moderação, medidas e recursos aplicáveis às áreas sociais do ParaBook.
        </p>
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
            <span>A versão somente entrará em vigor após o registro de aprovação e a publicação controlada.</span>
          </aside>
        )}

        <article className="glass-rule-card" data-revelar>
          <div className="rule-number">01</div>
          <div className="card-legal-content">
            <h2>Convivência e participação</h2>
            <p>O ParaBook busca promover leitura, criação literária e convivência respeitosa. Cada pessoa responde pelo conteúdo que publica e deve respeitar direitos autorais, privacidade, segurança e as regras aplicáveis à comunidade.</p>
            <p>As áreas autenticadas destinam-se a pessoas com 18 anos ou mais nesta versão. Contas em Modo Restrito etário mantêm os meios necessários para suporte, correção, segurança e exercício de direitos, sem acesso às funções sociais autenticadas.</p>
          </div>
        </article>

        <article className="glass-rule-card" data-revelar>
          <div className="rule-number">02</div>
          <div className="card-legal-content">
            <h2>Condutas proibidas</h2>
            <ul>
              <li><strong>Violação autoral:</strong> publicar obra, trecho, resenha ou material de terceiro sem direito ou autorização aplicável.</li>
              <li><strong>Assédio e discriminação:</strong> perseguir, ameaçar, humilhar ou atacar pessoas ou grupos por características pessoais ou protegidas.</li>
              <li><strong>Conteúdo ilegal ou abusivo:</strong> divulgar material ilícito, exploração, fraude, ameaça, invasão de privacidade ou incentivo a dano.</li>
              <li><strong>Spam e manipulação:</strong> automatizar abuso, publicar mensagens repetitivas, publicidade não autorizada ou manipular avaliações e interações.</li>
              <li><strong>Contorno de segurança:</strong> explorar falhas, acessar conteúdo privado sem autorização ou tentar superar controles técnicos e de moderação.</li>
            </ul>
          </div>
        </article>

        <article className="glass-rule-card" data-revelar>
          <div className="rule-number">03</div>
          <div className="card-legal-content">
            <h2>Protocolo, prioridade e prazos</h2>
            <p>Denúncias recebem protocolo imediato e são classificadas conforme o risco. P0 cobre risco imediato e recebe confirmação humana e triagem em até 6 horas; P1 cobre risco grave e recebe confirmação e triagem em até 1 dia útil; P2 cobre os demais casos e recebe confirmação e triagem em até 3 dias úteis.</p>
            <p>A decisão fundamentada é prevista em até 7 dias úteis para P0/P1 e até 15 dias úteis para P2. Os prazos contam no horário de Brasília: segunda a sexta, das 9h às 18h; sábado, das 10h às 15h; domingos e feriados sem atendimento regular. P0 admite escalonamento excepcional, sem promessa de plantão 24 horas. Diligências, ordens válidas ou preservação de evidências podem exigir ajuste comunicado quando possível.</p>
          </div>
        </article>

        <article className="glass-rule-card" data-revelar>
          <div className="rule-number">04</div>
          <div className="card-legal-content">
            <h2>Medidas e proporcionalidade</h2>
            <p>Uma denúncia não determina culpa nem remoção automática. A equipe pode orientar, advertir, limitar conteúdo, arquivar, restaurar ou aplicar contenção cautelar proporcional ao risco. Suspensões temporárias usam exclusivamente 3, 7, 15 ou 30 dias. Exclusões definitivas exigem a autoridade e o procedimento aplicáveis.</p>
            <p>Casos P0 podem receber contenção reversível imediata. Reincidências são consideradas junto com gravidade, contexto, tempo transcorrido, histórico e medidas anteriores, sem aumento automático de sanção. A decisão registra a regra aplicada, o fato resumido, a medida, sua duração, o responsável e a possibilidade de revisão, sem exposição pública do histórico disciplinar.</p>
          </div>
        </article>

        <article className="glass-rule-card" data-revelar>
          <div className="rule-number">05</div>
          <div className="card-legal-content">
            <h2>Resposta, recurso e privacidade</h2>
            <p>A pessoa afetada poderá apresentar esclarecimentos, contranotificação ou recurso quando cabível. A análise preservará apenas as evidências necessárias e limitará o acesso a moderadores e administradores autorizados.</p>
            <p>A identidade e os dados de contato do denunciante permanecem confidenciais perante a pessoa denunciada por padrão. Eventual revelação exige obrigação legal, ordem válida ou necessidade estritamente demonstrada para a defesa, com decisão registrada e divulgação limitada ao mínimo necessário.</p>
            <p>O ParaBook poderá agir antes da manifestação em caso de risco imediato, segurança, proteção de pessoa vulnerável ou ordem válida, sem eliminar o direito de revisão posterior quando juridicamente possível.</p>
          </div>
        </article>

        <article className="glass-rule-card" data-revelar>
          <div className="rule-number">06</div>
          <div className="card-legal-content">
            <h2>Documentos relacionados</h2>
            <p>Estas diretrizes complementam os <Link to="/termos">Termos de Uso</Link>, a <Link to="/privacidade">Política de Privacidade</Link>, os <Link to="/publicacao-e-licenca">Termos de Publicação e Licença</Link> e a política de <Link to="/direitos-autorais">Direitos Autorais e Denúncias</Link>.</p>
          </div>
        </article>
      </div>
    </main>
  );
}

export default Diretrizes;
