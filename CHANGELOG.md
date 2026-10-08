# Changelog

## Sessão 020 — 05–07/10/2026

### Definições e situação dos gates

- Preservados os aceites G1/G7 e as decisões/alterações da Sessão 019, incluindo G5 aceito em desenvolvimento com ressalvas e sua métrica original de 90%.
- G2, G3, G4 e o pacote técnico G6 foram encerrados em desenvolvimento com ressalvas. Os sete gates já foram trabalhados; G2–G6 mantêm condições de operação integral abertas. Não foi atribuído indicador de 7/7 operacional nem novo aceite integral.
- Adotada a opção A do G2. Detalhes técnicos resolvidos autonomamente, sem repetir escolhas aprovadas ou condicionar o desenvolvimento a investimentos e respostas de fornecedores.

### Implementação

- **G2 — idade e acesso:** marco etário com fuso/versão, prazo de sete dias, censo somente leitura e barreiras comuns a JWT, cookie, sessionid, templates e Django Admin. Revisão web/Expo idempotente, análise administrativa com RBAC, reautenticação, auditoria e prova R10 transacionais; maioridade reavaliada no acesso. Direitos, suporte e saída preservados no Modo Restrito, sem coleta de documentos ou biometria.
- **G3 — operação, denúncia e Conselho:** fila persistida com responsáveis, prioridades, calendário e prazos; denúncia pública sem conta, protocolo privado, confirmação, complemento, decisão e retorno. Recursos e suspensão reversível; Conselho exige duas identidades distintas reautenticadas, alvo/arquivos conferidos, auditoria, RLS e travas G5. Painel Operação e Conselho e prévia de retenção; atalhos destrutivos administrativos bloqueados.
- **G4 — direitos, cofre e upload:** direitos por edição/arquivos, origem, território, modalidade e vigência; recibo Ed25519, conferência restrita e custódia cifrada independente do runtime. Motor/assinaturas com validade e revarredura; PDF e amostra servidos pelos mesmos bytes verificados. Curadoria também passa por revisão; disputa, revogação e expiração bloqueiam acesso. Recurso acolhido não republica nem substitui licença; integração com retenção/exportação G5.
- **G6 — clientes e acessibilidade:** campos/botões com nomes e estados acessíveis, alvos mobile mínimos, contraste, safe areas e abas adaptadas à fonte. Leitores com texto extraído por página e limites explícitos para PDFs sem texto; conteúdo anterior removido no logout. Timeout, retentativa GET limitada, refresh/CSRF compartilhados e descarte de respostas antigas; falhas de mutação não simulam sucesso. Recuperação de sessão web distingue indisponibilidade de credenciais inválidas.
- Onze migrations aditivas posteriores à primeira publicação desta sessão: `usuarios.0013–0018`, `biblioteca.0017–0020` e `comunidades.0007`, aplicadas somente em bancos sintéticos. G6 não adicionou migrations/dependências; testes concorrentes G2/G3 fecham as conexões ao terminar, permitindo descarte do banco de testes.

### Validação

- Evolução da suíte backend nesta janela: **291 → 315 → 387 → 421 testes**. Resultado final **421/421**, com saída 0 e banco de testes descartado; `check` e verificação de migrations aprovados.
- Web final: **182/182**, lint/build aprovados; mobile: **24/24**, TypeScript e versões Expo aprovados, bundles Android/iOS/web exportados. OpenAPI estrito e **152 operações consumidas** compatíveis.
- Ensaios sintéticos de revisão etária, denúncia/retorno, Conselho, publicação/disputa/recurso, mídia privada, temas e teclado. Navegador final em 360/390/1280px com interrupção/retomada da API e recuperação da mesma sessão; falhas sem falso sucesso.
- ClamAV 1.5.4 real com base NDB sintética e custódia cifrada com identidades Linux separadas ensaiados. Isso não homologa assinaturas oficiais, licenças reais, hosting ou dispositivos físicos.
- Manifestos históricos S019/G2/G3/G4 preservados; selo adicional G6 vincula fontes, logs, imagens e bundles ao pacote validado. Código técnico conferido por hash antes dos novos commits.

### Entrega e continuidade

- No início da sessão, publicados os commits `35540507c`, `11e22f1b6` e `43758ab61`, incluindo a implementação herdada da Sessão 019 e a primeira entrega desta janela. Render/Vercel receberam `43758ab61` mediante pedido explícito; essa versão antecede a opção A G2 e os encerramentos G3/G4/G6.
- No fechamento, autorizados commits e envio dos pacotes posteriores de backend, clientes e deste resumo. O envio ao Git não comprova implantação/homologação hospedada da versão final.
- Ressalvas remanescentes: configuração/rollout hospedado e revalidação proporcional G7; capacidade humana, Conselho/calendário/canais reais; licenças, cofre/recuperação/storage e distribuição territorial; instrumentos de fornecedores, descarte externo e cópias; aparelhos Android/iOS, tecnologias assistivas, segundo navegador e zoom/motion.
- Sessão 021 preparada para resolver essas ressalvas com evidências, preservando as definições aprovadas e distinguindo definição, implementação e validação. Documentos internos, prompts, logs e segredos continuam locais e ignorados pelo Git.

## Sessão 019 — 03–05/10/2026

### G5 — privacidade e segurança

- Aceite final registrado em 05/10: etapa encerrada no escopo de desenvolvimento, com ressalvas de operação. A métrica ponderada original avançou de 36,25% para 90%; fornecedores permanecem em 2/4. O fechamento não certifica produção ou conformidade integral.
- Consolidadas governança, retenção por destino, incidentes, acesso excepcional e RIPD, preservando as decisões anteriores e a continuidade sem investimento ou espera por fornecedores.
- Implementados exportação própria T01–T13, encerramento transacional com revogação imediata, preservação de contexto de terceiros, provas cifradas com chave dedicada e descarte controlado de banco/arquivos. A prévia CLI permanece sem escrita.
- Adicionados procedimentos operacionais, minimização de eventos/logs, restrições RLS e sete migrations, aplicadas somente em bancos sintéticos isolados.
- Ajustadas as configurações avançadas React para exportação JSON e encerramento; corrigidos CRLF no build Linux e configuração de logs Gunicorn.

### Validação e limites

- Backend: 252/252 testes; `check` aprovado e verificação de migrations sem mudanças.
- Web: 172/172 testes, lint/build e contrato de 129 operações aprovados; temas e larguras de 390/875/1280 px conferidos. Fontes web/contratos inalteradas na homologação ampliada.
- Homologação local sintética com Linux, Django 6.0.8, PostgreSQL 17, Gunicorn, HTTPS verificado, banco com TLS, filesystem persistente, backup cifrado e restauração com reaplicação de revogações, fila e preservações.
- Aplicação hospedada, instrumentos de fornecedores, expurgo externo, ciclo efetivo de cópias e recuperação independente mantêm condições abertas. Operação e revisão continuam manuais.
- Código e migrations permanecem locais, sem commit, push ou deploy. Sessão 020 preparada para G2, G3 e G4, com G6 ainda dependente de homologação dos clientes e acessibilidade.

## Sessão 010 — 06/09/2026

### Publicação e moderação de obras

- Formalizada a máquina de estados de obras, tentativas, denúncias e recursos.
- Adicionados RBAC no backend, transações, auditoria obrigatória e notificações internas.
- Autores podem retirar apenas as próprias obras; a retirada bloqueia novos envios por 24 horas sem impedir revisões da obra existente.
- Revisões preservam a edição publicada até a nova aprovação, salvo restrição de moderação.
- Denúncias não ocultam obras automaticamente; suspensão cautelar, decisão, recurso, reabertura e restauração exigem fundamento.
- O Dashboard passa a concentrar o acervo de domínio público/licenciado e a revisão de arquivos privados.
- Adicionada a migration `biblioteca.0011`, com conversão segura das solicitações e denúncias existentes.

### Integração mobile

- Alinhados catálogo, estante, comunidades, perfis e leitura ao contrato `/api/v1`.
- Reforçada a sessão JWT com refresh único, persistência serializada no SecureStore e proteção contra respostas tardias após logout.
- Leituras recebem uma única retentativa em falhas transitórias; mutações não são reenviadas automaticamente.
- Listas paginadas são percorridas com validação da origem da próxima página.
- O JWT deixou de ser inserido na WebView do leitor; o cliente nativo consulta a autorização e entrega apenas os bytes do PDF.
- Obras retiradas ou suspensas permanecem visíveis na estante como indisponíveis.
- Gerados bundles Android e iOS. A matriz responsiva cobre iPhones 13, 14 e variantes; a homologação nativa em aparelhos continua pendente.

### Repositório

- A documentação da pasta raiz `docs/` passa a ser local e ignorada pelo Git.
- O histórico das branches `main`, `develop` e `front-end-review` foi reescrito para remover os arquivos antigos de `docs/`.
- A pasta técnica versionada `parabook-mobile/docs/` permanece no repositório.

### Validação

- 162 testes Django completos e verificação de migrations aprovados.
- 163 testes web, lint e build aprovados.
- 9 testes mobile, TypeScript e exportações Android/iOS aprovados.
- 33 testes direcionados de autenticação backend aprovados.

### Pendências conhecidas

- Homologar os fluxos autenticados em aparelhos iOS e Android.
- Definir canal externo de denúncias, prazos operacionais, retenção e validação jurídica de licenças.
- Aplicar a migration e publicar as mudanças somente após revisão do deploy.
