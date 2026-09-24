# Deploy do ParaBook: Vercel + Render + Supabase

## Arquitetura adotada

- **Vercel:** frontend React/Vite em `parabook-web/`.
- **Render:** API Django/Gunicorn construída pelo `Dockerfile` da raiz.
- **Supabase:** PostgreSQL e bucket privado de mídia.

O ParaBook ainda não tem receita e manterá `PAYMENTS_ENABLED=False`. Essa
arquitetura permite validar o produto sem custo inicial, dentro das cotas e dos
termos de cada provedor. Antes de monetizar, reavalie os planos: o Hobby da
Vercel é destinado a uso pessoal e não comercial.

O backend não deve ser implantado como função Vercel: o projeto aceita PDFs de
até 5 MiB, executa migrations e foi desenhado para um processo Gunicorn. O
Render executa esse contêiner; o Supabase guarda dados e mídia persistente.

## 1. Preparar o Supabase

1. Em **Connect**, copie a URL do **Session pooler**, porta 5432. Ela evita a
   dependência de IPv6 no Render. Se a senha tiver caracteres reservados,
   use a URL já fornecida pelo painel ou aplique URL encoding.
2. Em **Storage**, crie o bucket privado `parabook-media`.
3. Em **Storage > Configuration > S3**, habilite S3 e gere Access Key/Secret.
   Copie também endpoint e região. Nunca exponha essas credenciais no frontend
   nem use prefixo `VITE_` nelas.
4. Se houver dados locais, use `pg_dump`/`pg_restore`; não copie o diretório
   físico do PostgreSQL entre versões.

Para preparar manualmente um banco vazio, sem registrar a senha no Git:

```powershell
$env:DATABASE_URL='URL_DO_SESSION_POOLER'
venv\Scripts\python.exe manage.py migrate --noinput
venv\Scripts\python.exe manage.py createsuperuser
```

## 2. Criar o backend no Render

O arquivo `render.yaml` é o Blueprint do serviço:

1. Envie estas alterações ao repositório remoto.
2. No Render, escolha **New > Blueprint**, conecte o repositório e aplique o
   Blueprint encontrado na raiz.
3. Preencha os valores solicitados (`sync: false`):
   - `FRONTEND_URL`: URL esperada do projeto Vercel, por exemplo
     `https://parabook.vercel.app`;
   - `DATABASE_URL`: Session pooler do Supabase, porta 5432;
   - `SUPABASE_STORAGE_ENDPOINT`, `SUPABASE_STORAGE_REGION`,
     `SUPABASE_STORAGE_ACCESS_KEY` e `SUPABASE_STORAGE_SECRET_KEY`.
4. O Render gera `SECRET_KEY`, fornece o hostname ao Django, constrói o
   `Dockerfile` e monitora `/health/`.
5. Abra `/health/`, `/ready/` e `/api/docs/` na URL `onrender.com` criada.

O plano gratuito não oferece etapa de pre-deploy. Por isso `RUN_MIGRATIONS=true`
faz o script de inicialização executar migrations idempotentes antes de
`collectstatic` e Gunicorn. Isso acrescenta alguns segundos ao início, mas é
seguro com a única instância gratuita. Ao migrar para plano pago, prefira uma
etapa de pre-deploy e desative `RUN_MIGRATIONS` no processo web.

`RUN_SEED_ACERVO=true` executa `seed_acervo --if-needed`: o comando retorna sem
escrita quando as 11 categorias e 55 obras-base já existem e, em acervo parcial,
cria apenas os itens ausentes. Ele nunca remove nem atualiza livros existentes.
`RUN_SEED_ADMIN` permanece `false`; para uma rotação administrativa controlada,
cadastre `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no
Render, ative a flag por um deploy e torne a desativá-la depois.

O Blueprint mantém pagamentos, e-mail e recuperação de senha desligados. O Render
gratuito bloqueia as portas SMTP usuais; portanto, recuperação por e-mail não será
entregue nesta fase. Quando necessário, adote um provedor com API HTTPS e habilite
`EMAIL_ENABLED=True` e `PASSWORD_RESET_ENABLED=True` somente após validar o envio.

## 3. Criar o frontend na Vercel

1. Importe o mesmo repositório como novo projeto.
2. Selecione `parabook-web` como **Root Directory**.
3. Use Framework Preset **Vite**, build `npm run build` e output `dist`.
4. Em Production, cadastre:

   ```text
   VITE_API_URL=https://parabook-api.onrender.com/api/v1
   ```

   O código usa essa mesma URL canônica como fallback de produção, mas uma
   variável cadastrada no painel sempre prevalece. Confira se a Vercel não
   conserva um valor legado antes do próximo build.
5. Faça o deploy. O `vercel.json` fixa `npm run build`, saída `dist` e preserva
   acessos diretos às rotas do React.
6. Se a URL final da Vercel diferir da prevista, corrija `FRONTEND_URL` no
   Render e faça um novo deploy do backend.

Cada mudança de `VITE_API_URL` exige novo build do frontend.

## 4. Cookies, CORS e primeiro login

Nos domínios gratuitos, `vercel.app` e `onrender.com` são sites diferentes. O
Blueprint configura cookies `Secure` e `SameSite=None`, enquanto
`FRONTEND_URL` alimenta CORS e CSRF com uma origem exata. Não use curingas.

Alguns navegadores ou modos de privacidade bloqueiam cookies de terceiros mesmo
com essa configuração. A solução definitiva é publicar frontend e API sob o
mesmo domínio registrável (por exemplo, `app.exemplo.com` e
`api.exemplo.com`) e então voltar os três `*_SAMESITE` para `Lax`.

Teste em produção: cadastro, login, refresh da página autenticada, logout,
upload/leitura de PDF e uma ação protegida por CSRF.

## 5. Inicialização entre Vercel e Render

A Vercel entrega o frontend estático pela CDN e não precisa ser “acordada”. Ao
abrir o ParaBook, o `AuthProvider` consulta o perfil no backend; essa primeira
requisição já desperta naturalmente o Render. Após 15 minutos sem tráfego, o
Render gratuito pode hibernar, e a primeira resposta seguinte pode demorar até
cerca de um minuto.

Não foi adicionado ping artificial entre serviços: ele consumiria cotas para
contornar deliberadamente a política do plano gratuito e não faria a Vercel
“ligar” mais rápido. O vínculo correto é funcional: Vercel chama Render, Render
usa Supabase, e os deploys automáticos acompanham commits no repositório.

## 6. Pagamentos bloqueados

`PAYMENTS_ENABLED=False` faz o backend:

- recusar checkout pago, portal e webhook antes de chamar a Stripe;
- não carregar segredos Stripe;
- sinalizar à interface que planos pagos estão indisponíveis;
- manter o plano gratuito contratável.

No React, os botões pagos continuam focáveis/clicáveis para exibir um
SweetAlert imediato e mostram uma dica no hover ou foco. Para reativar cobrança
no futuro, será necessário cadastrar novas credenciais, configurar e validar o
webhook, testar idempotência/cancelamento e só então definir
`PAYMENTS_ENABLED=True`. Também será necessário usar planos compatíveis com uso
comercial.

## 7. Docker local

```powershell
docker compose up --build
```

O Compose usa PostgreSQL 17. O serviço `migrate` espera o banco ficar saudável,
aplica migrations e libera o `web`. A imagem de produção é multi-stage, roda
como usuário sem privilégios e inicia Gunicorn pelo mesmo script usado no
Render; bind mount e `runserver` permanecem restritos ao desenvolvimento.
