# Publicação e moderação — etapa 1

Implementação local em 05/09/2026, sobre `main` em `b47011dda`, integrada por fast-forward à `develop`. Sem commit, push ou deploy nesta etapa.

## Regras implementadas

- Estados da obra separados da tentativa e da denúncia: pendente, publicado, rejeitado, suspenso, retirado e removido. Transições passam pelo serviço transacional `biblioteca/publicacao.py`, com autorização, bloqueio de linha, auditoria obrigatória e notificações internas.
- Autor gerencia apenas obras vinculadas à sua solicitação. Retirada imediata bloqueia novas obras por 24 horas desde a retirada. Outra obra retirada reinicia a janela; repetir a mesma retirada não reinicia. Revisar e reenviar a mesma obra não recebe essa espera.
- Tentativas preservam metadados, arquivo e decisão. Revisão material mantém a edição aprovada disponível até aprovação, salvo restrição. Correção automática é conservadora: apenas normalização de espaços no título enviado isoladamente. Outros ajustes passam pela revisão.
- Administradores cadastram somente domínio público/licenciado pelo Dashboard. O formulário de autoria, o Django Admin e caminhos legados não permitem contornar o fluxo. A decisão não impõe segundo administrador obrigatório para catálogo.
- Denúncia autenticada exige fundamento/evidências e recebe protocolo; não oculta automaticamente. Administradores registram também referência de recebimento externo. Suspensão, decisão e reabertura exigem motivo e preservam histórico.
- Um recurso por evento elegível; outro revisor é recomendado e sinalizado, não obrigatório. Acolhimento não supera retirada voluntária, outras restrições ou decisões posteriores. Recurso contra rejeição abre nova análise, sem publicar automaticamente.
- Restauração confere restrições, datas de disponibilidade e validade estrutural do arquivo. Não equivale a validação jurídica de contrato nem antivírus.
- Estante preserva referências indisponíveis. Arquivos de revisão são acessados por endpoint administrativo autenticado, sem URL de armazenamento no contrato. Não há garantia de revogação de arquivos previamente entregues ao dispositivo.
- Purga definitiva e automação destrutiva legada ficam bloqueadas enquanto a retenção não for definida. Stripe e envio de e-mail continuam desativados.

## Contrato e telas

Prefixo de todos os endpoints: `/api/v1/`.

| Área | Contrato |
|---|---|
| Autor | `biblioteca/minhas-publicacoes/`, `disponibilidade/` e ações por obra: `historico/`, `versoes/`, `retirar/`, `revisar/`, `reenviar/`, `recurso/` |
| Novo envio | `biblioteca/solicitacoes-publicacao/` |
| Denúncias | `biblioteca/denuncias/`: criação e acompanhamento próprio |
| Revisão administrativa | `dashboard/publicacoes/{solicitacao_id}/revisao/`; `?arquivo=pdf` transmite o PDF autenticado |
| Decisões | `dashboard/moderacao/{categoria}/{id}/`; aprovação da publicação recebe `tentativa_id` para detectar fila desatualizada |
| Recursos | `dashboard/recursos-publicacao/` |
| Recuperação | `dashboard/lixeira/`: restaurar/reabrir com motivo; exclusão definitiva bloqueada |

Web: `/minhas-publicacoes`, bloqueio informativo em Publicar Livro, prévia administrativa da revisão, denúncias reais na página do livro, recursos e protocolo externo no Dashboard. Histórico e versões do autor são paginados; listas próprias de denúncias e fila de recursos estão limitadas a 100 registros nesta versão.

## Banco e implantação

Migration `biblioteca.0011` cria versões, eventos, recursos e bloqueio; gera um UUID diferente por denúncia existente e converte cada solicitação antiga em tentativa inicial, preservando os arquivos e a data. Histórico anterior que nunca foi registrado não é reconstruído ficticiamente.

Aplicada apenas no PostgreSQL local. Antes do deploy: backup do PostgreSQL, revisão da migration, ensaio em cópia representativa e publicação coordenada backend/web. O startup atual do Render aplica migrations; considerar seu tempo no cold start. Depois, conferir envio, revisão, retirada, acesso negado ao PDF e moderação com contas de teste.

Rollback recomendado: restaurar a versão da aplicação mantendo o schema expandido, após verificar compatibilidade. Reverter a migration descarta novas tabelas/campos e não preserva tentativas e auditoria; exige backup/plano de dados, não é rollback sem perda. Não apagar arquivos históricos do Storage.

## Evidência de validação

- 162 testes Django aprovados (33 novos), incluindo concorrência real PostgreSQL, RBAC, reversão por falha de auditoria/notificação, mídia privada, transições e migração com dados preexistentes.
- `manage.py check` aprovado; `makemigrations --check --dry-run` sem alterações adicionais.
- 163 testes web, lint e build aprovados.
- Navegador local: envio de revisão e retirada reais com dados sintéticos; tela do autor em 390/1280 px nos temas claro/escuro; Dashboard com fila, prévia autenticada e seção de recursos.
- Nenhum teste de dispositivo mobile ou deploy em produção executado nesta etapa.

## Decisões operacionais ainda abertas

Definir canal externo efetivo e responsável pela triagem, prazos de atendimento, retenção e contratos/licenças quando houver acervo licenciado. O código permite protocolar o recebimento externo; não cria um canal público de contato nem um serviço de e-mail. Antivírus e verificação jurídica de licenças não foram implementados ou aprovados por inferência.
