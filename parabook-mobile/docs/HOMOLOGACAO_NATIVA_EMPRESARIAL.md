# Homologação nativa empresarial

Decisão aprovada em 08/09/2026. Expo SDK 54, React Native 0.81 e React 19.1.

## Builds controlados

- `development-simulator`: iPhone 13 e iPhone 14 em simulador.
- `development-device`: iPhone físico e APK Android interno com `expo-dev-client`.
- `preview`: binário interno próximo de produção, sem ferramentas do cliente de desenvolvimento.
- `production`: reservado ao candidato de loja; não publicar sem autorização.

Antes do primeiro build, vincular o projeto à conta EAS autorizada com `eas init`. O `projectId` gerado não deve ser inventado manualmente.

## Matriz aprovada

| Faixa | Referência | Cobertura mínima |
|---|---|---|
| iOS | iPhone 13 | simulador e fumaça em aparelho físico |
| iOS | iPhone 14 | simulador e fumaça em aparelho físico |
| Android entrada Samsung | Galaxy da linha A de entrada, 360 dp, memória restrita | Android 7/API mínima suportada ou a menor versão realmente disponível no aparelho homologado |
| Android intermediário Samsung | Galaxy A intermediário | versão intermediária mantida pelo fabricante |
| Android avançado Samsung | Galaxy S atual ou equivalente | API 36/versão-alvo do build |

Registrar modelo exato, versão do sistema, memória, tamanho de tela, identificador do build, data, executor e evidência. A categoria comercial do aparelho não substitui essas informações.

## Roteiro crítico

1. Instalação limpa, abertura, teclado, Safe Area, texto ampliado e voltar preditivo.
2. Login, 2FA quando aplicável, SecureStore, refresh concorrente, logout e reinstalação.
3. Catálogo, busca, paginação e detalhes em rede normal, lenta e interrompida.
4. Estante: adicionar/remover, limite, repetição e retomada após falha.
5. PDF privado e amostra: autorização, WebView, segundo plano, retorno, memória e ausência de JWT na URL.
6. Comunidades: listar, entrar/sair, postar/responder e permissões.
7. Autor/moderação: superfícies por papel e bloqueio de navegação forçada.
8. Conta suspensa: navegação pública como visitante, configurações/suporte disponíveis e demais ações bloqueadas com prazo restante.

## Critério de aceite

- zero defeito bloqueador ou alto;
- defeitos médios com responsável, mitigação e prazo;
- todos os fluxos críticos com evidência em cada faixa;
- diferenças específicas de fabricante registradas;
- nova rodada obrigatória quando mudar SDK, dependência nativa, autenticação, armazenamento seguro, WebView ou configuração de build.
