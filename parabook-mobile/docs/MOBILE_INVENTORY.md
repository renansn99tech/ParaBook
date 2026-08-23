# Inventario funcional do ParaBook Mobile

Levantamento feito a partir de `parabook-web/src/App.jsx`, das chamadas em `parabook-web/src` e das rotas/serializers Django em `*/api/`.

## Matriz Web, API e Mobile

| Area Web | Regra/acao principal | API existente | Destino mobile |
| --- | --- | --- | --- |
| Home | destaques de livros e comunidades | `GET /biblioteca/livros/`, `GET /comunidades/comunidades/` | Home |
| Login/cadastro | cookie HttpOnly no Web; JWT Bearer no app nativo | `POST /auth/mobile-login/`, `POST /auth/mobile-register/` | Login, Cadastro |
| Recuperacao de senha | email com link para o front Web | `POST /auth/recuperar-senha/` | Recuperar senha |
| Biblioteca/catalogo | busca, categorias, adicionar a estante | livros, categorias e estante | Explorar, Detalhes do livro |
| Minha biblioteca | quero ler, lendo, lido, favoritos e avaliacoes | CRUD `/biblioteca/estante/` | Minha Biblioteca e filtros do Perfil |
| Livro/resenhas | detalhes, nota e resenha | detalhe, `resenhas/`, estante | Detalhes do livro |
| Leitura | PDF autenticado | `GET /biblioteca/livros/:id/ler_pdf/` | Leitor em WebView/PDF.js |
| Comunidades | descobrir, minhas, entrar/sair | ViewSet de comunidades e `entrar/` | Comunidades |
| Conteudo da comunidade | feed e criar postagem | ViewSet de postagens | Comunidade e Postagem |
| Criar comunidade | limite e governanca aplicados no servidor | `POST /comunidades/comunidades/` | Nova comunidade |
| Perfil | dados, estatisticas e favoritos | perfil atual e perfil publico | Perfil e Perfil publico |
| Autores | autores aprovados | `GET /perfis/autores/` | Autores |
| Notificacoes | listar e marcar como lida | ViewSet e actions de notificacoes | Notificacoes |
| Gamificacao | conquistas, ranking, XP | endpoints de gamificacao | Jornada do leitor |
| Planos/assinatura | planos e portal Stripe | endpoints de assinaturas | nao priorizado no fluxo de leitura mobile |
| Publicacao de livro | envio multipart e moderacao | solicitacao de publicacao | nao priorizado: fluxo especializado de autor |
| Dashboard | moderacao/admin | endpoints de dashboard | fora do app de usuario comum |

## Funcional com API atual

- Login e cadastro nativos com JWT Bearer.
- Restauracao de sessao enquanto o access token for valido.
- Perfil autenticado e perfil publico.
- Catalogo, pesquisa, categorias, detalhes e resenhas.
- Estante, status de leitura, favoritos, nota e resenha.
- PDF autenticado.
- Comunidades, associacao, feed e criacao de postagens/comunidades.
- Autores, notificacoes, conquistas e ranking.
- Solicitacao de recuperacao de senha.

## Implementado, aguardando backend

### Comentarios de postagem

- Situacao: a interface reservada aparece em Detalhes da Postagem, sem mock.
- Endpoint necessario: CRUD de comentarios associado a `PostagemComunidade`, com autor e data somente leitura.
- Comportamento: listar por postagem e permitir criar; editar/excluir apenas pelo autor ou moderador.
- Arquivos provavelmente envolvidos: `comunidades/models.py`, `comunidades/api/serializers.py`, `comunidades/api/views.py`, `comunidades/api/urls.py` e migrations.
- Impacto Web: opcional, mas o mesmo contrato permitiria adicionar comentarios em `ConteudoComunidade.jsx`.
- Risco: moderacao, autorizacao e volume de conteudo gerado por usuario.

### Renovacao de JWT nativo

- Situacao: o backend entrega refresh token no login/cadastro mobile, mas `/auth/refresh/` le somente o cookie HttpOnly da Web.
- Endpoint necessario: renovacao exclusiva para cliente nativo recebendo refresh token no corpo e devolvendo novo par rotacionado.
- Comportamento: validar, rotacionar e invalidar o refresh anterior conforme `SIMPLE_JWT`.
- Arquivos provavelmente envolvidos: `usuarios/api/views.py`, `usuarios/api/urls.py`, schema/testes de autenticacao.
- Impacto Web: nenhum se a rota mobile continuar separada.
- Risco: tokens de longa duracao exigem rate limit, rotacao e blacklist corretos.

## Compatibilidade do leitor

O projeto usa `react-native-webview` na versao recomendada pelo Expo SDK 54 e compativel com Expo Go. O PDF e buscado dentro da WebView com `Authorization: Bearer` e renderizado por PDF.js. Nao foi introduzida biblioteca PDF nativa.

Limitacao operacional: o leitor depende do CDN do PDF.js; uma versao futura pode empacotar os assets do PDF.js para eliminar essa dependencia de rede adicional.
