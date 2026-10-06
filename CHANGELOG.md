# Changelog

## Sessão 020 — 05/10/2026

### Idade, operação e arquivos privados

- G2: validado o marco etário com fuso/versão, prazo de sete dias e proteção comum de JWT, cookie, sessionid, templates e Django Admin. Catálogo público não recupera privilégios pelo fallback de sessão; suporte, direitos e saída permanecem acessíveis.
- Adicionados censo somente leitura, formulário legado e fluxo Expo de elegibilidade/direitos; React e Expo consultam a decisão do backend ao prazo/retorno. Retentativas de declaração preservam idempotência.
- G3: entregues fila mínima somente leitura, calendário explícito de atendimento e checagens preparatórias de ficha/Conselho. Persistência de triagem/SLA, canal externo e retorno efetivo continuam pendentes.
- G4: adicionadas duas migrations de verificação/quarentena, adaptador local ClamAV e gates de aprovação/restauração/entrega por conteúdo. PDF é servido pelos mesmos bytes verificados; mídia privada direta bloqueada no desenvolvimento e leitor legado alinhado à API.
- Backend: 291/291 testes (+39), check/migrations aprovados. Web: 172/172, lint/build. Mobile: TypeScript e 14/14 testes; aparelhos reais pendentes. OpenAPI estrito e 135 operações consumidas compatíveis.
- G1/G7 e aceite G5 da Sessão 019 preservados. G2/G3/G4 seguem parciais no critério integral: rollout hospedado, operação real e antimalware/cofre/licenças ainda não homologados. Flags reais não ativadas; sem commit, push, deploy ou purga.

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
