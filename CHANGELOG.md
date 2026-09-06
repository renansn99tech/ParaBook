# Changelog

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
