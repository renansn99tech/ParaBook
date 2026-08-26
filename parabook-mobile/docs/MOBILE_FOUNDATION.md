# Mobile Foundation

Diagnostico e contrato da fundacao mobile, validado em 2026-08-26 contra o codigo Django, a aplicacao Web e as rotas publicadas no Render.

## Contrato de autenticacao nativa

Base remota padrao: `https://parabook-nl8o.onrender.com/api/v1`. O app pode sobrescrever esse valor com `EXPO_PUBLIC_API_URL`, sem depender de `localhost` no iPhone fisico.

| Fluxo | Endpoint | Contrato mobile |
| --- | --- | --- |
| Login | `POST /auth/mobile-login/` | Envia `username` e `password`; recebe `access` e `refresh`. |
| Cadastro | `POST /auth/mobile-register/` | Envia `username`, `email`, `password`, `password_confirm` e `termos_aceitos`; recebe `access` e `refresh`. |
| Usuario autenticado | `GET /auth/profile/` | Bearer; retorna o registro `Usuario` e `user_auth`. |
| Perfil atual | `GET /perfis/meu-perfil/` | Bearer; retorna identidade e dados do perfil. |
| Perfil completo | `GET /perfis/:username/` | Bearer; retorna perfil, estatisticas, favoritos, historico e comunidades. |
| Logout | local | Remove os tokens da memoria e do `SecureStore`. A revogacao no servidor depende de backend. |

O Web usa rotas separadas (`/auth/login/`, `/auth/register/`, `/auth/refresh/` e `/auth/logout/`) com JWT em cookies HttpOnly e CSRF. Esse fluxo nao deve ser reutilizado pelo Expo Go.

## Estados de inicializacao

- Sem tokens: encerra a inicializacao e abre Login/Cadastro.
- Token aceito: carrega usuario e perfil em paralelo e abre as cinco abas autenticadas.
- Resposta 401: encerra o estado autenticado, limpa a sessao e abre Login.
- Timeout ou falha de rede: preserva a sessao persistida, mostra uma tela recuperavel e oferece nova tentativa ou retorno ao Login.
- Falha ou atraso do `SecureStore`: a interface muda de estado antes da limpeza persistente e nunca fica bloqueada indefinidamente.

## BACKEND NECESSARIO

### Renovacao do JWT nativo

- Problema: o login/cadastro mobile devolve `refresh`, mas `POST /auth/refresh/` le somente o cookie HttpOnly usado pelo Web.
- Endpoint: recomenda-se `POST /api/v1/auth/mobile-refresh/`, recebendo o refresh no corpo e devolvendo o par rotacionado.
- Arquivos envolvidos: `usuarios/api/views.py`, `usuarios/api/urls.py`, schema e testes de autenticacao.
- Impacto: sem isso, a restauracao funciona apenas enquanto o access token de 60 minutos estiver valido.

### Logout e revogacao nativos

- Problema: `MobileTokenObtainPairAPIView` e `MobileRegisterAPIView` nao registram `SessaoDispositivo`; `POST /auth/logout/` revoga apenas o refresh em cookie do Web.
- Endpoint: recomenda-se `POST /api/v1/auth/mobile-logout/`, autenticado por Bearer e capaz de revogar/blacklistar a sessao nativa.
- Arquivos envolvidos: `usuarios/api/views.py`, `usuarios/api/urls.py`, `usuarios/security.py` e testes.
- Impacto: o logout no aparelho e funcional, mas um access token copiado permanece valido ate expirar.

### Paridade de 2FA no login mobile

- Problema: `CookieTokenObtainPairAPIView` exige TOTP quando habilitado, mas `MobileTokenObtainPairAPIView` valida apenas usuario e senha.
- Endpoint: `POST /api/v1/auth/mobile-login/`.
- Arquivos envolvidos: `usuarios/api/views.py`, serializer/schema e testes; depois, tela `LoginScreen.tsx` no mobile.
- Alteracao recomendada: aplicar o mesmo desafio `requires_2fa` do Web ao endpoint nativo e aceitar `codigo_2fa`.
- Impacto: contas com 2FA podem atualmente contornar o segundo fator usando o endpoint mobile.

## Checklist manual no Expo Go

- [ ] Abrir sem sessao e confirmar que Login/Cadastro aparece sem loading infinito.
- [ ] Entrar com credenciais validas e confirmar Home com o nome real.
- [ ] Fechar completamente e reabrir o Expo Go; confirmar restauracao da sessao valida.
- [ ] Testar senha incorreta e confirmar mensagem do backend sem usuario ficticio.
- [ ] Cadastrar uma conta com senha e confirmacao; testar tambem senhas diferentes e termos desmarcados.
- [ ] Confirmar dados reais nas telas Home e Perfil.
- [ ] Abrir Home, Catalogo, Biblioteca, Comunidades e Perfil pelas cinco abas.
- [ ] Abrir um livro pela aba Biblioteca e voltar sem erro de rota.
- [ ] Desligar a rede durante a restauracao, confirmar estado recuperavel e usar `Tentar novamente` apos reconectar.
- [ ] Usar `Ir para o login` no erro de rede e confirmar a limpeza local.
- [ ] Fazer logout no Perfil e confirmar retorno ao fluxo publico.
- [ ] Reabrir o app depois do logout e confirmar que a sessao nao reaparece.
