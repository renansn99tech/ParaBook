# ParaBook — runbook de operações

Status: preparado para homologação. A ativação em Render exige as ações humanas listadas abaixo.

## Indicadores e respostas

- Liveness: `GET /health/` deve retornar HTTP 200.
- Readiness: `GET /ready/` deve retornar HTTP 200; HTTP 503 indica indisponibilidade do PostgreSQL.
- SLO inicial proposto: 99,5% mensal para a API; p95 abaixo de 800 ms nas rotas de leitura.
- Alertas mínimos: cinco erros 5xx em cinco minutos; readiness falhando por dois minutos; webhook Stripe com 4xx/5xx; uso de disco/banco acima de 80%.

## Incidente

1. Registrar horário, ambiente, versão/commit e impacto.
2. Conferir `/health/`, `/ready/` e logs JSON pelo `request_id`/horário.
3. Se a versão nova causou o incidente, executar rollback para a versão anterior no Render.
4. Não apagar registros de pagamento, auditoria ou uploads para “destravar” o serviço.
5. Documentar causa, correção e ação preventiva em até dois dias úteis.

## Backup e restauração

- Rodrigo/operador do Render deve habilitar backups automáticos do PostgreSQL e registrar retenção e região.
- Fazer teste trimestral de restauração em banco isolado, nunca sobre produção.
- Registrar RPO/RTO medidos. Meta inicial: RPO 24 h e RTO 4 h.
- Supabase Storage deve usar bucket privado para PDFs e política de retenção compatível com exclusão LGPD.

## Checklist de deploy

- CI verde, migrations revisadas e backup recente confirmado.
- Variáveis obrigatórias configuradas; nenhum segredo em log ou repositório.
- Executar `python manage.py migrate` e smoke tests de login, leitura, publicação, email e assinatura.
- Validar webhook no modo de teste da Stripe antes de promover.
- Monitorar logs e health checks por 30 minutos após a publicação.
