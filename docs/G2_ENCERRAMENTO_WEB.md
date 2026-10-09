# G2 — encerramento no escopo web preparado

Data: 09/10/2026. Escopo aprovado por Renan: implementação web preparada e
homologada em staging, com encerramento de 100% desse escopo. A ativação pública
é uma etapa de lançamento; homologação física/nativa e assistiva pertence ao G6.

## Entrega e evidências

- Ciclo etário hospedado homologado com 13 contas exclusivamente sintéticas:
  77 verificações aprovadas, incluindo restrição, prazo, correção, cooldown,
  maioridade, revisão administrativa, idempotência, direitos, cookies e CSRF.
- Cliente web hospedado conferido nos temas claro e escuro, com encaminhamento
  à elegibilidade, suporte, revisão e declaração adulta. Aceite de termos segue
  como etapa independente; o ensaio não aceitou termos em nome dos usuários.
- 48 regressões locais aprovadas após a correção, em PostgreSQL sintético;
  checks aprovados e nenhuma alteração de models sem migration.
- Migration `usuarios.0019_elegibilidade_runtime_rls` aplicada no staging:
  acesso backend à revisão corrigido, RLS preservado e sem concessão de acesso
  direto às tabelas etárias pela Data API. Eventos permitem leitura/inserção;
  estados e revisões permitem também atualização; nenhum permite DELETE ao runtime.
- Chave exclusiva do staging instalada; 11 provas autenticadas em memória.
  Backups cifrados e registros locais preservados, sem conteúdo privado no Git.
- Janela sintética encerrada: política desligada; 20 eventos, 11 provas e
  oito estados preservados. Não é necessário repetir essa bateria para encerrar
  o mesmo código e configuração homologados.

As contagens medem verificações executadas, não percentual de cobertura. O
100% registra o cumprimento do escopo aprovado, não operação pública já ativa.
Relatórios detalhados e manifestos permanecem no acervo operacional local.

## Checklist de lançamento público

1. Aplicar a migration publicada no ambiente alvo usando a conexão de migrations.
2. Conferir os pré-requisitos documentais/configuração do alvo, sem presumir
   aprovação a partir do ensaio ou reabrir aprovações anteriores sem mudança material.
3. Configurar chave própria, versão, censo e marco de rollout que assegure os
   sete dias previstos; não copiar chave ou marco do staging.
4. Ativar somente mediante autorização de lançamento e conferir os pontos
   alterados no alvo, sem repetir toda a homologação já aprovada.

Essas tarefas acompanham o lançamento e não mantêm aberto o G2 neste escopo.
Ensaios em aparelhos e tecnologias assistivas são acompanhados pelo G6.
O encerramento não reclassifica os demais gates nem os aceites históricos.
