# Relatório de implementação da blindagem

Data: 13/08/2026  
Branch: `develop`  
Situação: implementação local concluída para homologação; sem commit ou deploy nesta etapa.

## Implementado

| Item | Entrega |
|---|---|
| SEC-01 | Catálogo público somente leitura; escrita direta exige staff/superuser; publicação de autor continua pela fila moderada. |
| SEC-02 | Produção fail-closed para secret, banco, hosts e SMTP; HTTPS/HSTS/cookies seguros; CORS não foi restringido conforme decisão. |
| SEC-03 | JWT em cookies HttpOnly, CSRF em operações mutáveis, rotação/blacklist de refresh e remoção dos tokens do `localStorage`. |
| SEC-04 | `cryptography`, `h2`, `setuptools` corrigidos e `PyPDF2` migrado para `pypdf`; Django compartilhado mantido em 4.2 com warning de fim de suporte. |
| SEC-05 | Limites de corpo/upload, throttle, assinatura/estrutura/páginas/criptografia do PDF e erro interno não exposto ao cliente. |
| SEC-06 | Webhook Stripe autenticado, transacional e idempotente; IDs Stripe removidos da resposta pública; retorno do portal sem open redirect. |
| SEC-07 | Throttling por risco, senha atual para exclusão e trilha persistente de ações sensíveis. |
| ENG-01 | CI para backend/web/mobile e testes de regressão de catálogo, cookies/CSRF, upload e idempotência Stripe. |
| ENG-03 | Logs JSON, liveness, readiness, SLO inicial e runbook de incidente/backup/rollback. |
| PERF-01 | Code splitting por rota; lint e build; imagens usam lazy loading onde aplicável. |
| TRUST-01 | Declaração autoral versionada e minimizada; minuta de fluxo LGPD/direitos autorais pronta para avaliação. |
| PROD-02 | Método heurístico declarado pela API e UI; removida alegação de IA generativa; sinais e versão retornados. |
| INV-02 | Modelo vivo de piloto, coorte, marcos e critérios; métricas finais continuam atualizáveis. |

## Parcial ou dependente de ação externa

- SEC-05: antimalware e PDFs privados dependem de serviço de varredura e configuração do bucket Supabase privado. A validação estrutural local está pronta, mas não substitui antivírus.
- ENG-03: health checks e logs estão prontos; alertas, retenção, Sentry/APM e testes reais de restauração dependem das contas e do ambiente de deploy.
- PERF-01: code splitting foi implementado; seis PNGs críticos ainda medem aproximadamente 1,5–2,4 MB e precisam de conversão/otimização visual aprovada.
- TRUST-01: implementação/minutas prontas, mas política e textos não podem ser ativados como versão jurídica final antes de revisão.
- SEC-04 mobile: correções compatíveis foram tentadas; 18 achados transitivos permanecem no toolchain do Expo SDK 54. O único autofix oferecido instala Expo 57 com breaking change, portanto não foi usado.

## Adiado por decisão

- ENG-02: contrato de API, paginação e alinhamento mobile; exige definição conjunta antes de alterar endpoints.
- DATA-01: analytics, consentimento, taxonomia de eventos, retenção e governança LGPD.
- PROD-01: painel de valor para autores; aguarda dados confiáveis de DATA-01.
- INV-01: dashboard executivo/data room; aguarda DATA-01 e métricas financeiras consistentes.
- GTM-01: narrativa e posicionamento comercial; aguarda evidências de dados/produto/investor readiness.

## Ações de Renan e/ou Rodrigo

### Render e deploy

1. Revisar e configurar `SECRET_KEY`, `DEBUG=False`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, cookies `Secure=True` e `JWT_COOKIE_SAMESITE`/`CSRF_COOKIE_SAMESITE` apropriados aos domínios reais.
2. Aplicar migrations, configurar `/health/` e `/ready/` no monitoramento e validar rollback.
3. Habilitar backup do PostgreSQL, definir retenção/região e executar teste de restauração isolado.
4. Configurar logs/alertas e, se aprovado, Sentry/APM; registrar SLO, RPO e RTO medidos.
5. Tornar o bucket de PDFs privado, validar URLs assinadas/controle de leitura e contratar/configurar antimalware.

### Email SMTP

1. Informar no Render `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` e `DEFAULT_FROM_EMAIL`.
2. Configurar SPF, DKIM e DMARC no domínio e testar entrega, spam, reset de senha e não enumeração de contas.

### Stripe e pagamentos

1. Configurar `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` por ambiente, sem reutilizar chaves de teste em produção.
2. Registrar o endpoint `/assinaturas/webhook/` na Stripe e selecionar os eventos usados pelo sistema.
3. Conferir os `stripe_price_id` dos planos, Customer Portal, URLs de sucesso/cancelamento e fluxo de reembolso/cancelamento.
4. Executar testes em modo Stripe Test para pagamento inicial, repetição do mesmo evento, renovação, falha e cancelamento; conferir assinatura e notificações no banco.

## Validação local

- Backend: 10 testes aprovados; system check sem problemas; migrations sem mudanças pendentes; `pip check` sem dependências quebradas.
- Web: lint sem avisos; build aprovado; auditoria npm com zero vulnerabilidades.
- Mobile: TypeScript aprovado; auditoria ainda reporta 18 vulnerabilidades transitivas vinculadas ao Expo SDK 54.
