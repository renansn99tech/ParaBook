# Mobile — integração e homologação da etapa 2

## Escopo aprovado em 06/09/2026

1B, 2A, 3A, 4A, 5A e 6A. Android e iOS, fluxos existentes, sessão persistente nativa, leitura online, ambiente isolado antes de produção e retentativas limitadas sem fila de mutações.

## Mudanças

- JWT permanece fora do HTML do leitor. O cliente nativo busca o PDF pelo endpoint autenticado, com refresh quando necessário, e transmite apenas os bytes à WebView. Cache e armazenamento DOM desabilitados; reabertura/retorno do segundo plano consulta a autorização novamente. PDF.js externo existente continua sendo dependência de conectividade; avaliação dinâmica desativada. Validar uso de memória e carregamento do worker em ambos os aparelhos antes da liberação.
- Falhas transitórias de refresh não encerram sessão; refresh inválido encerra. Geração da sessão impede aplicação de respostas antigas após logout/troca; persistência serializa save/clear. A renovação de 401 continua única para requisições concorrentes.
- GET recebe no máximo uma retentativa por falha de transporte/502/503/504. POST/PATCH/DELETE não são repetidos por erro de rede. Repetição após 401 ocorre apenas depois da renovação de autenticação, antes de a view ter autorizado a mutação.
- Catálogo, categorias, estante, resenhas e listas de comunidades percorrem a paginação, validando origem/caminho e ciclos. Limite defensivo de 100 páginas produz erro explícito. Tela de estante informa retirada/suspensão sem apagar a referência.
- Leitura conserva progresso salvo e não redefine um livro já lido para lendo. Sincronização malsucedida informa o usuário; conclusão permanece no backend idempotente.

## Contratos conferidos

| Fluxo | API `/api/v1/` |
|---|---|
| Sessão | `auth/mobile-login/`, `mobile-register/`, `mobile-refresh/`, `mobile-logout/`, `auth/profile/` |
| Perfil | `perfis/meu-perfil/`, `perfis/{username}/` |
| Catálogo e leitor | `biblioteca/livros/`, `{id}/`, `{id}/ler_pdf/`, `{id}/resenhas/`, `biblioteca/categorias/` |
| Estante | `biblioteca/estante/`, filtros livro/status, PATCH por item |
| Comunidades | `comunidades/comunidades/`, `{id}/entrar/`, `comunidades/postagens/`, `comunidades/respostas/` |

## Evidências e limites

TypeScript e nove testes de regressão locais; 33 testes Django de usuários/autenticação aprovados. Exportação Metro/Hermes Android e iOS concluída. Compatibilidade Expo conferida pela matriz embutida offline; não equivale a Expo Doctor online nem build nativa assinada.

Smoke test sem autenticação no backend publicado: `/health/`, `/api/v1/biblioteca/livros/` e `/api/v1/biblioteca/categorias/` retornaram HTTP 200. Nenhuma conta/dado criado em produção. Homologação autenticada e visual em dispositivo Android/iOS ainda pendente: não há aparelho configurado confirmado nesta sessão. Nenhum commit, push, deploy ou publicação em loja.

## Ampliação da matriz iPhone — 06/09/2026

O escopo de compatibilidade agora inclui iPhone 13 e 14, além dos modelos 15+ mencionados anteriormente. O Expo SDK 54 suporta iOS 15.1 ou superior; portanto, um iPhone 13 ainda em iOS 15.0 precisa ser atualizado. A linha iPhone 14 já partiu de uma versão posterior do iOS.

| Perfil | Modelos cobertos | Verificação responsiva | Bundle iOS | Aparelho/simulador iOS |
|---|---|---|---|---|
| 375 × 812 | iPhone 13 mini | Aprovada | Aprovado | Pendente |
| 390 × 844 | iPhone 13, 13 Pro e 14 | Aprovada | Aprovado | Pendente |
| 393 × 852 | iPhone 14 Pro | Aprovada | Aprovado | Pendente |
| 428 × 926 | iPhone 13 Pro Max e 14 Plus | Aprovada | Aprovado | Pendente |
| 430 × 932 | iPhone 14 Pro Max | Aprovada | Aprovado | Pendente |

Foram conferidas no Expo Web as telas Bem-vindo, Login e Cadastro em todos os perfis. Não houve rolagem horizontal; os campos visíveis mantiveram 51 px de altura. O Cadastro, que é a tela pública mais densa, permaneceu utilizável no iPhone 13 mini. TypeScript e os nove testes de sessão, retentativa, paginação e SecureStore passaram novamente.

Essa evidência valida responsividade e capacidade de empacotamento. Ela não valida teclado nativo, Safe Area/notch, Face ID/SecureStore, WebView/PDF, memória ou retorno do segundo plano. Esses itens continuam exigindo execução em iPhone físico ou simulador no macOS. Não há Xcode, simulador iOS, EAS configurado ou relatório anterior de dispositivo neste workspace.

Para encerrar a homologação dos modelos 13/14, executar ao menos um aparelho da família com notch (preferência: iPhone 13 mini, caso crítico de largura) e um com Dynamic Island (iPhone 14 Pro). O iPhone 13 Pro Max/14 Plus pode ser coberto por simulador se o fluxo completo for repetido nos dois aparelhos físicos representativos. Registrar modelo, versão do iOS, Expo Go ou build, data e evidências de cada fluxo.

## Próximo ensaio em cada plataforma

1. Definir `EXPO_PUBLIC_API_URL=http://<IP-local>:8000/api/v1` no ambiente de desenvolvimento, backend isolado na rede local; iniciar com `npm.cmd start`. Para HTTPS publicado, usar o backend Render existente. Variáveis EXPO_PUBLIC nunca contêm segredos.
2. Registrar conta sintética com aceite; login, segundo fator quando habilitado, refresh simultâneo, logout e reabertura. Verificar renovação de termos quando a versão mudar e recuperação de senha desativada sem promessa de envio.
3. Catálogo/paginação; estante nos três estados, limite atingido e livro retirado/suspenso; PDF online, progresso, conclusão única, retorno do segundo plano e sessão expirada.
4. Perfil, comunidades, ingresso/saída, postagem/resposta e notificações. Conferir falhas 401/403/409, cold start, modo avião e retorno, sem duplicar gravações.
5. Repetir o conjunto delimitado no backend publicado com conta de teste autorizada. Registrar dispositivo, sistema, build, resultado e limpar apenas os dados sintéticos.

Comandos locais: `npm.cmd run typecheck`, `npm.cmd test`, `npx.cmd expo install --check`, `npx.cmd expo export --platform android --platform ios`. Backend: `venv\Scripts\python.exe manage.py test usuarios --noinput`.

Referências consultadas: https://docs.expo.dev/versions/v54.0.0/ e https://docs.expo.dev/versions/v54.0.0/sdk/securestore/ e https://docs.expo.dev/versions/v54.0.0/sdk/webview/ .
