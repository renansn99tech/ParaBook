# ParaBook — Plano de Blindagem e Investor Readiness

**Status:** aprovado parcialmente — execução autorizada conforme decisões abaixo

**Versão:** 1.0 — 13/08/2026

**Branch-base:** `develop`

**Regra de governança:** nenhuma iniciativa deste documento está autorizada para implementação enquanto sua decisão estiver como `PENDENTE`.

## 1. Objetivo

Transformar o ParaBook em um produto tecnicamente confiável, mensurável e apresentável a potenciais investidores, parceiros educacionais e autores independentes. O plano combina quatro resultados:

1. reduzir riscos de segurança, privacidade e pagamentos;
2. elevar previsibilidade de entrega e operação;
3. produzir evidências reais de tração e retenção;
4. fortalecer a proposta de valor para autores e leitores.

Este documento não estima valuation nem tamanho de mercado sem pesquisa validada. Também não presume tração que ainda não esteja instrumentada.

## 2. Resumo executivo para investidores

### Tese do produto

O ParaBook pode ocupar a interseção entre leitura digital, descoberta social e economia criativa:

- **Leitores:** descobrem obras, organizam leituras, avaliam livros e participam de comunidades.
- **Autores independentes:** publicam com moderação, constroem audiência e futuramente monetizam sua produção.
- **Instituições e administradores:** obtêm governança, curadoria, segurança e indicadores de engajamento.

### Diferenciais que precisam ser comprovados

- Comunidade e identidade literária além de um catálogo estático.
- Funil integrado entre descoberta, leitura, avaliação e relacionamento com autores.
- Infraestrutura de confiança para publicação independente e direitos autorais.
- Dados próprios de preferência e comportamento de leitura, tratados com consentimento e governança LGPD.
- Capacidade de monetização recorrente por assinatura e, futuramente, serviços para autores/marketplace.

### Evidências que ainda precisam ser produzidas

| Evidência | Indicador mínimo | Situação atual |
|---|---|---|
| Ativação | usuário adiciona primeiro livro ou entra em comunidade | Não instrumentado |
| Retenção | D1, D7 e D30 por coorte | Não instrumentado |
| Engajamento | leituras iniciadas/concluídas e avaliações por usuário ativo | Parcialmente armazenado, não consolidado |
| Conversão | cadastro → ativação → premium | Não instrumentado ponta a ponta |
| Oferta de autores | autores aprovados, obras submetidas/publicadas e tempo de moderação | Dados dispersos |
| Receita | MRR, ARPU, churn, LTV e inadimplência | Stripe integrado, métricas não consolidadas |
| Confiança | denúncias, prazo de resolução, reincidência e recursos | Fluxos parciais |
| Qualidade | disponibilidade, erros, latência e sucesso de deploy | Sem observabilidade consolidada |

## 3. Diagnóstico técnico resumido

### Pontos fortes atuais

- Backend modular em Django/DRF com PostgreSQL.
- Frontend React já cobrindo a superfície funcional principal.
- Autenticação JWT, RBAC de negócio, moderação, soft delete e transações em fluxos importantes.
- Integração Stripe, Supabase Storage, notificações e gamificação.
- Aplicativo Expo/React Native iniciado.
- Build web aprovado e suíte backend existente com 6 testes aprovados.

### Riscos que afetam diligência técnica

- Escrita no catálogo de livros permissiva para usuários autenticados.
- Configurações de produção não falham de forma segura quando secrets estão ausentes.
- Tokens JWT persistidos em `localStorage`.
- Django 4.2 no ambiente compartilhado/produção está fora do período de suporte.
- Dependências Python e mobile com vulnerabilidades conhecidas.
- Uploads sem validação profunda e mídia potencialmente exposta por bucket público.
- Webhook Stripe sem deduplicação persistente de eventos.
- Ausência de throttling, cobertura suficiente de testes, CI e observabilidade.
- Schema OpenAPI incompleto, sem paginação global e com contratos mobile divergentes.
- Assets grandes e bundle inicial acima do ideal.
- Ausência de métricas de produto e receita consolidadas.

## 4. Como aprovar este plano

Cada iniciativa tem um identificador estável e uma decisão independente:

- `APROVADO`: pode ser detalhada e implementada na ordem proposta.
- `APROVADO COM AJUSTES`: depende das condições escritas pelo responsável.
- `ADIADO`: permanece no backlog, sem implementação agora.
- `REJEITADO`: sai do roadmap até nova decisão explícita.
- `PENDENTE`: estado inicial; não autoriza mudanças.

Os tamanhos `P`, `M` e `G` representam esforço relativo, não prazo contratual. O prazo depende da capacidade da equipe, ambientes e decisões de produto.

## 5. Portfólio de iniciativas

### Bloco A — Blindagem essencial

#### SEC-01 — Autorização forte do catálogo

- **Prioridade:** P0
- **Tamanho:** M
- **Decisão:** `APROVADO`
- **Problema:** `LivroViewSet` permite métodos de escrita a qualquer usuário autenticado.
- **Entrega:** separar leitura pública de criação/modificação; aplicar permissões de admin/autor e propriedade; impedir alteração direta de `autor`, `origem` e `status`; manter publicação pelo fluxo moderado.
- **Aceite:** testes provam que leitor não cria/edita/exclui, autor só atua no próprio fluxo e admin mantém moderação; requisição forçada por URL retorna 403.
- **Rollback:** restaurar somente o endpoint anterior, preservando migrations (não são esperadas migrations nesta iniciativa).

#### SEC-02 — Configuração de produção fail-closed

- **Prioridade:** P0
- **Tamanho:** M
- **Decisão:** `APROVADO COM AJUSTES` — manter a política CORS atual nesta etapa; todos os demais controles permanecem autorizados.
- **Entrega:** separar settings por ambiente ou validar variáveis críticas; remover secret/senha de fallback; retirar wildcard de hosts; restringir CORS; configurar HTTPS, HSTS progressivo, cookies seguros, proxy SSL e headers.
- **Aceite:** `manage.py check --deploy` sem alertas de segurança aplicáveis; aplicação de produção recusa iniciar sem secrets obrigatórios; staging validado antes de HSTS longo.
- **Dependência:** inventário das URLs reais de frontend, backend e storage.
- **Rollback:** variáveis e flags de staging permitem retorno controlado, sem desabilitar proteções permanentemente.

#### SEC-03 — Sessão web resistente a XSS e roubo de token

- **Prioridade:** P0
- **Tamanho:** G
- **Decisão:** `APROVADO`
- **Entrega:** refresh token em cookie `HttpOnly`, `Secure` e `SameSite`; access token curto em memória ou adoção de BFF; rotação/blacklist; logout e revogação; proteção CSRF conforme arquitetura escolhida.
- **Aceite:** refresh token não aparece em `localStorage`; logout invalida renovação; testes cobrem expiração, rotação, CSRF e múltiplas abas.
- **Dependência:** SEC-02 e decisão arquitetural cookie+BFF versus cookie direto na API.
- **Rollback:** feature flag temporária para sessão antiga apenas em staging.

#### SEC-04 — Dependências suportadas e reproduzíveis

- **Prioridade:** P0
- **Tamanho:** M
- **Decisão:** `APROVADO COM AJUSTES` — não alterar o pin compartilhado do Django 4.2 agora; manter warning explícito sobre fim de suporte.
- **Entrega:** migrar produção para Django suportado; resolver vulnerabilidades de `cryptography`, `h2`, `PyPDF2/setuptools`; criar locks/perfis de dependência compatíveis com os ambientes da equipe; atualizar mobile dentro da matriz oficial do Expo, sem `--force` cego.
- **Aceite:** auditorias Python/web/mobile documentadas; zero vulnerabilidade crítica/alta explorável aceita sem justificativa; CI testa a matriz suportada; Docker e desenvolvimento usam versões deliberadas.
- **Dependência:** decisão sobre Python 3.11 do colaborador e versão-alvo do Django (recomendação: 5.2 LTS ou superior suportado).
- **Rollback:** lockfiles preservam a última combinação homologada.

#### SEC-05 — Uploads e distribuição segura de obras

- **Prioridade:** P0
- **Tamanho:** G
- **Decisão:** `APROVADO`
- **Entrega:** validar assinatura/MIME, páginas e estrutura do PDF; limitar body no proxy; sanitizar nomes; varredura antimalware assíncrona; quarentena; bucket privado e URL assinada para conteúdo protegido.
- **Aceite:** arquivos inválidos, excessivos e malformados são rejeitados; obra pendente não tem URL pública; logs não expõem CPF ou caminhos sensíveis.
- **Dependência:** política de acesso para obras públicas, premium e de autor independente.
- **Rollback:** manter storage atual apenas para acervo explicitamente público.

#### SEC-06 — Pagamentos idempotentes e auditáveis

- **Prioridade:** P0
- **Tamanho:** M
- **Decisão:** `APROVADO`
- **Entrega:** registrar `event.id` da Stripe com unicidade; processar transacionalmente; evitar notificações/ativações duplicadas; validar configuração; preparar fila e retentativas; conciliar assinatura periodicamente.
- **Aceite:** o mesmo evento enviado duas vezes produz uma única alteração; falha parcial é recuperável; testes usam payloads assinados; métricas de falha e atraso disponíveis.
- **Dependência:** ambiente de teste Stripe e política de retenção dos eventos.
- **Rollback:** consumidor síncrono pode permanecer enquanto a deduplicação já estiver ativa.

#### SEC-07 — Antiautomação, ações sensíveis e trilha de auditoria

- **Prioridade:** P1
- **Tamanho:** M
- **Decisão:** `APROVADO COM AJUSTES` — novas regras de segurança podem ser incluídas se forem necessárias, documentadas e compatíveis com o escopo.
- **Entrega:** throttling em login, cadastro, reset, denúncias e publicação; reautenticação para exclusão de conta; log imutável de moderação/admin; alertas para abuso.
- **Aceite:** limites testados; exclusão exige confirmação forte; ações administrativas registram ator, alvo, data e motivo sem armazenar secrets.

### Bloco B — Engenharia e operação confiável

#### ENG-01 — Testes de regressão e CI obrigatório

- **Prioridade:** P0
- **Tamanho:** G
- **Decisão:** `APROVADO`
- **Entrega:** CI com lint/build web, check/migrations/testes backend, auditorias e validação OpenAPI; testes de RBAC, publicação, estante, gamificação, Stripe, privacidade e exclusões.
- **Aceite:** pull request não integra com falha; cobertura de fluxos críticos publicada; banco de teste isolado; nenhuma dependência de credencial real.

#### ENG-02 — Contrato API, paginação e mobile

- **Prioridade:** P1
- **Tamanho:** G
- **Decisão:** `ADIADO` — contrato e mobile precisam de definição específica posterior.
- **Entrega:** corrigir os alertas drf-spectacular; definir serializers de entrada/saída; versionar contrato; paginação global; alinhar mobile a `/api/v1`, recursos em português e JWT.
- **Aceite:** schema gerado sem erros; web e mobile testados contra o mesmo contrato; listas grandes não retornam tudo de uma vez.
- **Dependência:** SEC-01 e SEC-03.

#### ENG-03 — Observabilidade, SLO e recuperação

- **Prioridade:** P1
- **Tamanho:** M
- **Decisão:** `APROVADO`
- **Entrega:** rastreamento de erros, logs estruturados com correlação, métricas de latência/erro, health checks, alertas, backups e ensaio de restauração.
- **Aceite:** SLO inicial documentado; incidente simulado detectado; backup restaurado em ambiente isolado; runbook disponível.

#### PERF-01 — Performance e experiência percebida

- **Prioridade:** P1
- **Tamanho:** M
- **Decisão:** `APROVADO`
- **Entrega:** code splitting por rota, lazy loading, WebP/AVIF, `srcset`, compressão de assets, orçamento de bundle e medição de Core Web Vitals.
- **Aceite:** redução mensurável do bundle inicial e bytes de imagem; metas de LCP/INP/CLS definidas e medidas em mobile real; sem regressão dos temas ou acessibilidade.

### Bloco C — Produto, dados e confiança

#### DATA-01 — Analytics de produto com governança LGPD

- **Prioridade:** P1
- **Tamanho:** G
- **Decisão:** `ADIADO` — requisitos de analytics e governança serão definidos posteriormente.
- **Entrega:** taxonomia de eventos e funis de cadastro, ativação, leitura, comunidade, autor e premium; consentimento; minimização; retenção; dashboard por coorte.
- **Aceite:** D1/D7/D30, ativação e conversão calculáveis; eventos não contêm CPF, token, conteúdo privado ou dados desnecessários; dicionário de eventos versionado.
- **Dependência:** definição formal do evento de ativação e ferramenta de analytics.

#### PROD-01 — Painel de valor para autores

- **Prioridade:** P1
- **Tamanho:** G
- **Decisão:** `ADIADO` — depende da aprovação de DATA-01.
- **Entrega:** métricas de alcance, início/conclusão, avaliações, seguidores, conversão e status de moderação; feedback acionável; base para monetização futura.
- **Aceite:** métricas têm definição, período e fonte; autor só acessa dados próprios; limites de privacidade impedem reidentificação de leitores.
- **Dependência:** DATA-01 e regras comerciais para autores.

#### TRUST-01 — Direitos autorais, moderação e LGPD operacional

- **Prioridade:** P1
- **Tamanho:** G
- **Decisão:** `APROVADO COM AJUSTES` — preparar implementação e documentos para avaliação final antes de ativação operacional/jurídica.
- **Entrega:** termos versionados, evidência de aceite, declaração/autorização persistida, processo de denúncia e recurso, SLA, mapa de dados, política de retenção e atendimento ao titular.
- **Aceite:** cada obra tem proveniência auditável; cada decisão de moderação tem motivo; pedidos LGPD possuem fluxo e prazo; revisão jurídica registrada.
- **Dependência:** validação de CLO/jurídico antes de produção.

#### PROD-02 — Recomendação transparente e mensurável

- **Prioridade:** P2
- **Tamanho:** M
- **Decisão:** `APROVADO`
- **Entrega:** assumir formalmente o motor heurístico atual, medir CTR/adição/conclusão, explicar o motivo da recomendação e preparar experimento controlado antes de IA generativa.
- **Aceite:** nenhuma alegação enganosa de IA; baseline e experimento comparáveis; usuário pode entender e influenciar preferências.

### Bloco D — Investor readiness e crescimento

#### INV-01 — Dashboard executivo e data room

- **Prioridade:** P1
- **Tamanho:** M
- **Decisão:** `ADIADO` — depende da aprovação de DATA-01.
- **Entrega:** painel mensal de produto/receita/operação; arquitetura atual; roadmap; riscos; política LGPD; contratos; custos; evidências de backup, segurança e testes.
- **Aceite:** toda métrica aponta para fonte e período; números não validados são marcados; acesso ao data room é controlado e auditável.
- **Dependência:** DATA-01, ENG-03 e dados financeiros consistentes.

#### INV-02 — Piloto mensurável com instituição e autores

- **Prioridade:** P1
- **Tamanho:** G
- **Decisão:** `APROVADO COM AJUSTES` — preparar estrutura atualizável; métricas e escopo serão ampliados após as etapas hoje adiadas.
- **Entrega:** piloto com hipótese, público, duração, metas e entrevistas; onboarding acompanhado; relatório de resultados; termos e consentimentos adequados.
- **Aceite:** critérios definidos antes do início; retenção e feedback comparáveis; aprendizados geram decisão de continuar, ajustar ou encerrar.

#### GTM-01 — Posicionamento e narrativa comercial

- **Prioridade:** P2
- **Tamanho:** M
- **Decisão:** `ADIADO` — depende das iniciativas de dados, produto e investor readiness relacionadas.
- **Entrega:** pitch coerente para leitores, autores e instituições; demonstração curta; modelo de receita; diferenciação baseada em evidência; materiais sem métricas inventadas.
- **Aceite:** pitch responde problema, solução, público, tração, modelo, vantagem, riscos e uso do capital; cada afirmação quantitativa possui fonte.
- **Dependência:** resultados do piloto e dashboard executivo.

## 6. Sequência recomendada

### Fase 0 — Decisão e baseline

- Aprovar/rejeitar iniciativas.
- Registrar domínios, ambientes, versão de produção e responsáveis.
- Congelar baseline de testes, auditorias, bundle, latência e métricas disponíveis.
- Criar critérios de “pronto” e política de rollback.

### Fase 1 — Blindagem crítica

`SEC-01 → SEC-02 → SEC-04 → SEC-05 → SEC-06`

Gate de saída: nenhuma falha crítica de autorização conhecida; produção em versão suportada; secrets e HTTPS endurecidos; uploads e pagamentos com controles mínimos.

### Fase 2 — Identidade e previsibilidade

`SEC-03 + SEC-07 + ENG-01 + ENG-02 + ENG-03`

Gate de saída: sessão segura, CI bloqueante, contrato API confiável, alertas e recuperação testada.

### Fase 3 — Evidência de produto

`PERF-01 + DATA-01 + PROD-01 + TRUST-01 + PROD-02`

Gate de saída: experiência rápida, métricas governadas, valor mensurável para autores e processo de confiança auditável.

### Fase 4 — Evidência para capital e parcerias

`INV-01 + INV-02 + GTM-01`

Gate de saída: data room verificável, piloto concluído e narrativa comercial sustentada por dados.

## 7. Pacotes de aprovação sugeridos

### Pacote mínimo de blindagem

Recomendado como indivisível antes de ampliar tráfego ou pagamentos:

`SEC-01`, `SEC-02`, `SEC-04`, `SEC-05`, `SEC-06` e `ENG-01`.

### Pacote de prontidão operacional

`SEC-03`, `SEC-07`, `ENG-02`, `ENG-03` e `PERF-01`.

### Pacote de prontidão para investidores

`DATA-01`, `PROD-01`, `TRUST-01`, `INV-01`, `INV-02` e `GTM-01`.

`PROD-02` pode ser adiado sem comprometer a blindagem, desde que o produto não seja divulgado como IA generativa.

## 8. Formulário de decisão

Preencha uma opção por iniciativa e registre condições quando necessário.

| ID | Aprovar | Aprovar com ajustes | Adiar | Rejeitar | Condições/observações |
|---|:---:|:---:|:---:|:---:|---|
| SEC-01 | [x] | [ ] | [ ] | [ ] | Autorizado |
| SEC-02 | [ ] | [x] | [ ] | [ ] | Não restringir CORS nesta etapa |
| SEC-03 | [x] | [ ] | [ ] | [ ] | Autorizado |
| SEC-04 | [ ] | [x] | [ ] | [ ] | Manter Django 4.2 com warning |
| SEC-05 | [x] | [ ] | [ ] | [ ] | Autorizado |
| SEC-06 | [x] | [ ] | [ ] | [ ] | Autorizado |
| SEC-07 | [ ] | [x] | [ ] | [ ] | Permite regra adicional necessária |
| ENG-01 | [x] | [ ] | [ ] | [ ] | Autorizado |
| ENG-02 | [ ] | [ ] | [x] | [ ] | Definir posteriormente |
| ENG-03 | [x] | [ ] | [ ] | [ ] | Autorizado |
| PERF-01 | [x] | [ ] | [ ] | [ ] | Autorizado |
| DATA-01 | [ ] | [ ] | [x] | [ ] | Definir posteriormente |
| PROD-01 | [ ] | [ ] | [x] | [ ] | Aguarda DATA-01 |
| TRUST-01 | [ ] | [x] | [ ] | [ ] | Preparar para avaliação antes de ativar |
| PROD-02 | [x] | [ ] | [ ] | [ ] | Autorizado |
| INV-01 | [ ] | [ ] | [x] | [ ] | Aguarda DATA-01 |
| INV-02 | [ ] | [x] | [ ] | [ ] | Estrutura atualizável nesta etapa |
| GTM-01 | [ ] | [ ] | [x] | [ ] | Aguarda dependências |

## 9. Decisões necessárias antes da primeira implementação

1. Versão compartilhada de Python/Django e prazo para retirar Django 4.2 de produção.
2. Domínios oficiais e topologia backend/frontend para cookies, CORS e CSRF.
3. Política de acesso aos PDFs: público, autenticado, premium ou por licença.
4. Ferramenta de analytics e política de consentimento/retenção.
5. Ferramenta de observabilidade e orçamento mensal aceitável.
6. Modelo de valor para autores e hipótese principal do primeiro piloto.
7. Responsável jurídico por termos, direitos autorais e LGPD.

## 10. Próximo passo após aprovação

Para cada item aprovado, criar uma especificação curta contendo:

- ameaça ou hipótese que será tratada;
- arquivos e contratos impactados;
- testes antes da alteração;
- estratégia de implementação e migration;
- critérios de aceite mensuráveis;
- plano de rollout, monitoramento e rollback;
- atualização de documentação e evidências para o data room.

A execução deve começar por `SEC-01`, salvo decisão explícita em contrário, porque a autorização do catálogo é o risco de maior impacto imediato identificado no código atual.
