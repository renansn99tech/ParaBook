# Etapa 2 — integração mobile: decisões para aprovação

Estado: escolhas 1B, 2A, 3A, 4A, 5A e 6A aprovadas explicitamente em 06/09/2026. Android e iOS juntos; demais recomendações A aceitas. A tabela abaixo preserva as alternativas discutidas.

## Ponto de partida verificado

A atualização da develop incorporou oito commits da main. O mobile já usa `/api/v1`, endpoints JWT dedicados, refresh coordenado e SecureStore nativo. A etapa deve validar esse contrato e completar lacunas; não repetir uma migração de namespace já feita. Expo SDK 54, React Native 0.81 e React 19 são mantidos. A publicação/moderação concluída no backend deve ser respeitada por catálogo, estante e leitor mobile.

## Decisões

| Item | A (recomendação Tech Lead) | B | Consequência |
|---|---|---|---|
| 1 — Plataforma inicial | Android primeiro, iOS em seguida | Android e iOS juntos | A reduz a matriz inicial; B exige ambiente e dispositivo iOS disponíveis |
| 2 — Escopo | Estabilizar leitura, autenticação, catálogo, estante, perfil e regressão das comunidades existentes; publicação e administração no web | Incluir gestão de obras pelo autor nesta entrega mobile | B adiciona upload, versões, retirada, recurso e testes de permissão; administração permanece no Dashboard web |
| 3 — Sessão | Persistência nativa em SecureStore, renovação e limpeza no logout | Exigir novo login a cada abertura | A preserva UX, exige tratar expiração/revogação e falhas do armazenamento; Expo web fica para desenvolvimento, web de produção usa React/HttpOnly |
| 4 — Leitura | Online nesta fase, conferindo disponibilidade e permissões | Download offline | B exige política de cópia local, expiração, limpeza e limites da revogação; arquivos já entregues não podem ser recuperados remotamente |
| 5 — Homologação | Ambiente local/isolado primeiro, depois smoke test delimitado no backend publicado | Contratar staging permanente separado | A evita custo recorrente inicial; B permite ensaios compartilhados com maior isolamento. Nunca usar dados pessoais reais como fixtures |
| 6 — Falhas de rede | Retentativa limitada de leitura; gravações com retorno explícito e reconciliação | Fila offline de gravações com reenvio | B depende de idempotência e resolução de conflitos para estante/gamificação; não repetir POST automaticamente sem contrato |

## Execução após decisões

1. Inventariar telas e consumidores e comparar cada chamada com `config/urls.py`, `*/api/urls.py`, serializers e permissões reais. Conferir nomes, paginação, campos opcionais, erros e multipart. Preservar compatibilidade `/api/v1`.
2. Testar login/refresh/logout/registro, termos, sessão expirada e requisições simultâneas; nenhum token em logs, URLs ou mensagens de erro.
3. Validar catálogo, detalhes, leitura autorizada, retirada/suspensão, estante limitada, conclusão idempotente e perfil; regressão das comunidades já existentes.
4. Tratar cold start, timeout, conexão perdida e respostas 401/403/409 sem perder estado ou duplicar ações.
5. Executar TypeScript, verificações de compatibilidade Expo 54 e fluxos no dispositivo escolhido. Produzir matriz de evidências antes de publicar o aplicativo.

## Documentos de produto

Revisar `business_rules/aprovados/PUBLICACAO_MODERACAO_ETAPA_1.md` para refletir indisponibilidade e permissões no mobile. Cruzar os itens aplicáveis do guia mestre e das regras de autenticação, catálogo, estante, perfil e comunidades durante o inventário; as aprovações não se estendem automaticamente a offline, retenção local ou novas capacidades de autoria.

## Referência técnica

Antes de qualquer alteração mobile, reler suas instruções locais aplicáveis. SecureStore na versão exata: https://docs.expo.dev/versions/v54.0.0/sdk/securestore/ . Persistência varia entre plataformas e reinstalação não deve ser usada como contrato de logout.
