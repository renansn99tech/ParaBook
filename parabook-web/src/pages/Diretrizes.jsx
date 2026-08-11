import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/diretrizes.css';

function Diretrizes() {
  const paginaRef = useRevelacao([]);

  return (
    <main className="guidelines-main" ref={paginaRef} style={{ paddingTop: '80px', paddingBottom: '40px' }}>

      {/* Hero Section */}
      <div className="hero-guidelines" data-revelar>
        <h1 className="gradient-text">Termos e Políticas</h1>
        <p style={{ color: '#94a3b8', maxWidth: '650px', margin: '0 auto', fontSize: '1.1rem', lineHeight: 1.5 }}>
          Governança, privacidade e regras comunitárias da plataforma ParaBook. Conheça seus direitos e deveres antes de criar sua conta.
        </p>
        <small style={{ color: '#64748b', display: 'block', marginTop: '15px' }}>Última atualização: 10 de julho de 2026</small>
      </div>

      {/* Container dos Cards */}
      <div className="guidelines-container" data-revelar-cascata>

        {/* CARD 01: PRIVACIDADE */}
        <div className="glass-rule-card" data-revelar>
          <div className="rule-number">01</div>
          <div className="card-legal-content">
            <h3>Política de Privacidade e Proteção de Dados (LGPD)</h3>
            <p>O ParaBook valoriza a sua privacidade. Esta política explica de forma transparente como lidamos com as suas informações na nossa plataforma de redes sociais e gerenciamento de leituras.</p>
            
            <h4>Coleta e Uso das Informações</h4>
            <p>Coletamos dados fornecidos diretamente por você no momento do cadastro (nome completo, e-mail, nome de usuário e senha criptografada). Também registramos dados de interação com a plataforma, tais como histórico de leitura, livros adicionados às estantes, resenhas, notas e comentários, utilizados exclusivamente para personalizar sua experiência e manter a integridade do sistema.</p>
            
            <h4>Política de Retenção e Exclusão de Dados (LGPD)</h4>
            <p>Nossa arquitetura de banco de dados utiliza deleção em cascata (Atomic Transactions). Isso significa que, ao solicitar a exclusão de sua conta através do painel de Configurações, todos os seus dados pessoais, históricos de leitura e metadados associados são destruídos permanentemente e de forma irreversível de nossos servidores ativos, cumprindo integralmente com o Direito ao Esquecimento previsto na legislação brasileira.</p>
          </div>
        </div>

        {/* CARD 02: TERMOS DE USO */}
        <div className="glass-rule-card" data-revelar>
          <div className="rule-number">02</div>
          <div className="card-legal-content">
            <h3>Termos de Uso e Propriedade Intelectual</h3>
            <p>Ao se cadastrar e utilizar o ParaBook, você concorda explicitamente com as regras operacionais vigentes para a preservação de um ambiente saudável e seguro.</p>
            
            <h4>Regras de Utilização da Plataforma</h4>
            <p>Cada conta é pessoal, individual e intransferível. O usuário compromete-se a fornecer informações verídicas no ato do cadastro e assume total responsabilidade por todas as ações executadas sob suas credenciais de acesso.</p>
            
            <h4>Publicação de Livros, Comentários e Avaliações</h4>
            <p>A plataforma permite a catalogação de obras, inserção de resenhas literárias e notas textuais. Você retém a propriedade intelectual e direitos autorais dos textos originais das suas resenhas, mas concede ao ParaBook uma licença não exclusiva, mundial e gratuita para hospedar, exibir e processar esse conteúdo estritamente dentro da plataforma.</p>
            
            <h4>Direitos Autorais e Isenção de Responsabilidade (Uploads)</h4>
            <p>O ParaBook atua estritamente como provedor de aplicação de internet (Art. 19, Lei 12.965/14). Ao fazer o upload de qualquer obra ou arquivo para a plataforma, o <strong>Autor Independente declara, sob as penas da lei, ser o titular legítimo dos direitos patrimoniais e morais da obra</strong>. A plataforma exime-se de qualquer responsabilidade por violações de direitos autorais cometidas por seus usuários. Qualquer conteúdo denunciado por infração de propriedade intelectual (pirataria) será sumariamente removido e a conta do infrator poderá ser banida preventivamente e os dados de IP e data de aceite de termos repassados às autoridades competentes.</p>
          </div>
        </div>

        {/* CARD 03: DIRETRIZES DA COMUNIDADE */}
        <div className="glass-rule-card" data-revelar>
          <div className="rule-number">03</div>
          <div className="card-legal-content">
            <h3>Diretrizes da Comunidade e Responsabilidades</h3>
            <p>Nossa comunidade visa conectar leitores de forma harmoniosa. Comportamentos inadequados que prejudiquem a experiência coletiva sofrerão sanções administrativas e moderação ativa.</p>
            
            <h4>Condutas Proibidas</h4>
            <ul>
              <li><strong>Plágio:</strong> Copiar de forma integral ou parcial resenhas, críticas ou sinopses literárias de terceiros sem a devida atribuição de crédito.</li>
              <li><strong>Spam e Publicidade:</strong> Publicar anúncios não autorizados, links de afiliados repetitivos ou mensagens em massa nos comentários de livros ou perfis.</li>
              <li><strong>Discurso de Ódio e Assédio:</strong> Ofensas, discriminação de qualquer natureza, linchamento virtual de autores ou perseguição a membros da plataforma.</li>
              <li><strong>Conteúdo Ilegal:</strong> Divulgar material ilícito, pornográfico, abusivo ou manifestamente inadequado sob a legislação brasileira.</li>
            </ul>
            
            <h4>Responsabilidades do Usuário e do ParaBook</h4>
            <p>O usuário é juridicamente responsável pelo conteúdo de suas publicações e opiniões emitidas. O ParaBook atua como provedor de aplicação de internet, eximindo-se de responsabilidade direta pelas opiniões pessoais dos usuários, mas comprometendo-se a manter ferramentas eficientes de moderação, segurança tecnológica e estabilidade do sistema.</p>
            
            <h4>Atualizações desta Política</h4>
            <p>Reservamo-nos o direito de atualizar este documento periodicamente para adequações legais. Mudanças materiais significativas serão notificadas aos usuários via e-mail cadastrado ou alertas visíveis na interface do sistema.</p>
          </div>
        </div>

      </div>
    </main>
  );
}

export default Diretrizes;
