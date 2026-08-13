# ParaBook — pacote de confiança, LGPD e direitos autorais

Status: minuta técnica preparada em TRUST-01. **Não publicar nem tratar como parecer jurídico antes da revisão e aprovação responsáveis.**

## Controles preparados

- A declaração de autoria fica vinculada à solicitação, com versão dos termos e horário.
- O CPF da declaração não é armazenado em claro: somente HMAC e quatro últimos dígitos.
- Toda obra enviada permanece pendente de moderação.
- PDFs são verificados por assinatura, estrutura, criptografia, páginas e tamanho.
- Ações sensíveis geram trilha de auditoria sem senha, token ou CPF.

## Fluxo proposto de direitos autorais

1. Receber denúncia com identificação da obra, fundamento e evidência.
2. Emitir protocolo e restringir cautelarmente o acesso quando o risco justificar.
3. Preservar evidências e ouvir o autor dentro do prazo definido pela política jurídica.
4. Registrar decisão, fundamento, responsável e possibilidade de recurso.
5. Excluir ou restabelecer a obra; notificar as partes e preservar a trilha aplicável.

## Decisões pendentes de revisão

- Texto final dos termos, base legal, prazo de retenção e canal do titular LGPD.
- SLA de denúncias, contranotificação, recurso e reincidência.
- Papéis de controlador/operador com Render, Supabase, Stripe e provedor SMTP.
- Necessidade de DPO/encarregado e Relatório de Impacto à Proteção de Dados.
- Política de análise antimalware e bucket privado antes de produção.

## Evidências a manter

Versão dos termos, aceite, protocolo, decisões de moderação, eventos Stripe, acessos administrativos e comprovantes de exclusão/restauração devem ter retenção formalmente aprovada e acesso mínimo necessário.
