---
name: fechamento
description: Encerramento e resumo estruturado de sessão de trabalho no ParaBook — lê os commits recentes, sintetiza o que foi enviado ao Git, quantifica progresso de migrações estruturais e gera um prompt de continuidade para a próxima sessão. Use quando o usuário pedir "/fechamento" ou um resumo de encerramento da sessão.
---

# Procedimento de Fechamento de Sessão

Quando o usuário solicitar o encerramento ou um resumo com "/fechamento":

1. **Leitura dos Commits**: Execute `git log --oneline -n 10` (ou similar) localmente para ler as mensagens recentes.
2. **Resumo das Atividades**: Faça uma síntese estruturada (atuando como [💻 Tech Lead] ou [⚙️ COO]) das funcionalidades e refatorações que foram enviadas ao Git.
3. **Métricas de Progresso (Transições e Migrações)**: Se a sessão envolveu tarefas estruturais ou a migração para React, exiba um bloco quantificando o status geral (o que já foi migrado, o que falta, percentual de conclusão) com base na contagem de arquivos/componentes atuais.
4. **Comandos de Atualização**: Forneça os comandos exatos que o usuário precisará rodar futuramente caso haja pendências (ex: migrações de banco ou dependências a instalar), respeitando rigorosamente as regras de ambiente virtual (VENV).
5. **Prompt de Continuidade para a Próxima Sessão**: Gere, ao final do fechamento, um bloco de texto pronto para copiar/colar como primeira mensagem da próxima sessão, contendo:
   - **Contexto específico**: o que foi feito nesta sessão (síntese objetiva, principais commits e arquivos).
   - **Contexto macro**: visão geral do que o ParaBook está construindo agora (fase atual do roadmap, stack em transição).
   - **3 opções de melhoria** priorizadas para a próxima sessão, cada uma com uma frase justificando por que vale a pena.
