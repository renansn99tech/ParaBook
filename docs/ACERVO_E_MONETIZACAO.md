# Acervo e monetização do ParaBook

## Decisão atual: Alternativa B

A primeira versão separa gênero, origem editorial e modelo de acesso. Uma obra
independente continua pertencendo à sua categoria literária e recebe o selo
`Autor independente` sempre que `Livro.origem == "autor_independente"`.

Campos implementados em `Livro`:

- `origem`: domínio público, autor independente ou acervo licenciado;
- `modelo_acesso`: gratuito, incluído na assinatura ou somente amostra;
- `pdf_amostra`: arquivo distinto do conteúdo integral;
- `disponivel_de` e `disponivel_ate`: janela de disponibilidade;
- `territorio_cultural`: identificação editorial voluntária, sem endereço pessoal.

A decisão de leitura é responsabilidade de `biblioteca.services.verificar_acesso_obra`.
O cliente apenas apresenta essa decisão; ele não concede acesso. O PDF integral,
a amostra e a telemetria devem consultar a mesma regra.

### Regras operacionais desta fase

1. Obras existentes permanecem gratuitas após a migração.
2. Domínio público é cadastrado como gratuito.
3. Obras independentes podem ser gratuitas, de assinatura ou somente amostra,
   conforme acordo aprovado pela curadoria.
4. Obras licenciadas podem ter início e fim de disponibilidade.
5. A amostra é um PDF separado para que o arquivo integral nunca seja entregue
   ao navegador de quem não possui acesso.
6. Não existem carteira, compra avulsa ou repasse automático nesta fase.

## Evolução planejada: Alternativa A

A Alternativa A não deve ser construída acrescentando mais campos comerciais em
`Livro`. Ela deve extrair responsabilidades gradualmente e manter compatibilidade
com a API da Alternativa B durante a transição.

### Etapa A1 — direitos e contratos

- Criar `DireitoObra` com titular, território, vigência, exclusividade, versão do
  contrato e documento privado.
- Migrar `disponivel_de`, `disponivel_ate` e os metadados licenciados existentes.
- Exigir auditoria para alteração de vigência e titularidade.
- Definir política de retirada, renovação e preservação do histórico.

### Etapa A2 — ofertas de acesso

- Criar `OfertaAcesso` para acesso gratuito, assinatura, amostra e compra avulsa.
- Permitir mais de uma oferta por obra sem sobreposição inválida.
- Relacionar ofertas de assinatura aos planos elegíveis.
- Manter `verificar_acesso_obra` como fachada única enquanto sua implementação
  passa a consultar ofertas.

### Etapa A3 — coleções e curadoria

- Criar `Colecao` e `ColecaoLivro` com ordenação, vigência e justificativa editorial.
- Entregar vitrines paginadas pelo backend: Vozes Independentes, Cultura Local,
  Acervo Licenciado e Domínio Público.
- Registrar exposição e conversão sem usar popularidade como único critério.

### Etapa A4 — compras e contabilidade

- Criar `CompraObra`, itens financeiros imutáveis, reembolsos e conciliação.
- Definir divisão de receita, tributos e emissão fiscal antes do código de repasse.
- Avaliar Stripe Connect ou provedor equivalente; a integração Stripe atual cobre
  assinaturas, não marketplace nem pagamento a autores.
- Não calcular remuneração diretamente dos eventos brutos de leitura.

### Etapa A5 — fundo de apoio e repasses

- Criar ciclos mensais fechados e demonstrativos auditáveis.
- Aplicar antifraude, idempotência e critérios contratuais a sessões qualificadas.
- Começar com aprovação operacional do demonstrativo antes da automação bancária.
- Expor ao autor leituras qualificadas, base de cálculo, ajustes e valor liquidado.

### Critérios para sair da Alternativa B

A evolução é justificada quando houver contratos simultâneos difíceis de controlar
manualmente, múltiplos planos com catálogos distintos, compra avulsa ou repasse
recorrente a autores. Antes disso, devem existir testes de autorização, parecer
jurídico/tributário, política de reembolso e processo de conciliação financeira.

## Compatibilidade e remoção futura

Os campos simplificados de `Livro` só devem ser removidos depois que todos os
registros tiverem sido migrados para direitos e ofertas, os dois caminhos gerarem
a mesma decisão de acesso e o frontend deixar de consumir os campos antigos.
Essa remoção exige migração de dados reversível e uma janela explícita de transição.
