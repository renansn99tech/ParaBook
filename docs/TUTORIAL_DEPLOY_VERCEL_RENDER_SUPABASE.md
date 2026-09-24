# Tutorial completo — ParaBook na Vercel + Render + Supabase

> Guia operacional para publicar o frontend React/Vite na Vercel, a API
> Django/Gunicorn no Render e usar o PostgreSQL e o Storage do Supabase.
>
> Estado esperado do produto: pagamentos e envio de e-mail desativados,
> `PAYMENTS_ENABLED=False`, `EMAIL_ENABLED=False` e `PASSWORD_RESET_ENABLED=False`.

## 1. Visão geral

```text
Navegador
   |
   | HTTPS
   v
Vercel — React/Vite
   |
   | HTTPS + cookies HttpOnly + CSRF
   v
Render — Django REST + Gunicorn
   |                         |
   | PostgreSQL              | S3 privado
   v                         v
Supabase Database       Supabase Storage
```

Responsabilidades:

| Serviço | Responsabilidade | Não deve receber |
|---|---|---|
| Vercel | HTML, CSS, JavaScript e rotas da SPA | Senha do banco, S3 Secret Key ou segredos Django |
| Render | API, autenticação, regras de negócio, migrations e URLs assinadas | Arquivos persistentes no disco local |
| Supabase | PostgreSQL e PDFs/capas no bucket privado | Código do frontend ou execução do Django |

Arquivos principais deste deploy:

- `render.yaml`: Blueprint do serviço Render;
- `Dockerfile`: imagem de produção;
- `scripts/start.sh`: migrations, seeds condicionais, estáticos e Gunicorn;
- `config/settings.py`: banco, storage, hosts, CORS, CSRF e cookies;
- `parabook-web/vercel.json`: preset Vite e fallback do React Router;
- `parabook-web/.env.example`: variável pública do frontend;
- `.env.example`: referência local do backend.

## 2. Pré-requisitos

Antes de começar, tenha:

- uma conta no Supabase e o projeto já criado;
- uma conta no Render;
- uma conta pessoal na Vercel;
- o repositório em um provedor Git acessível pelo Render e pela Vercel;
- a branch de produção enviada ao remoto;
- um gerenciador de senhas.

Não coloque valores reais em `.env.example`, `render.yaml`, `vercel.json`,
issues, prints ou commits. O `.env` local está ignorado pelo Git, mas também
não deve ser compartilhado.

### 2.1 Escolha nomes previsíveis

Este tutorial usa os exemplos:

```text
Projeto Vercel: parabook
Serviço Render: parabook-api
Bucket Supabase: parabook-media
Frontend esperado: https://parabook.vercel.app
Backend esperado: https://parabook-api.onrender.com
```

Os subdomínios podem já estar ocupados. Substitua todos os exemplos pelas URLs
efetivamente criadas nos seus painéis.

## 3. Checklist local antes da publicação

Na raiz do repositório:

```powershell
git status -sb
venv\Scripts\python.exe manage.py check
venv\Scripts\python.exe manage.py makemigrations --check --dry-run
venv\Scripts\python.exe manage.py test
docker compose config --quiet
docker build --tag parabook:deploy-check .
```

No frontend:

```powershell
cd parabook-web
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
cd ..
```

Não publique se houver migrations não criadas, testes falhando ou segredos no
diff. Confira também:

```powershell
git diff --check
git diff --stat
git check-ignore -v .env
```

## 4. Configurar o Supabase Database

### 4.1 Obter a URL correta

No painel do projeto Supabase:

1. Clique em **Connect**.
2. Localize **Shared Pooler / Supavisor**.
3. Selecione **Session mode**.
4. Copie a connection string da porta **5432**.

Para o contêiner persistente do Render, use Session Pooler:

```text
postgresql://postgres.PROJECT_REF:SENHA@aws-REGIAO.pooler.supabase.com:5432/postgres
```

Não use a porta 6543 neste deploy. Ela representa Transaction Pooler e é mais
apropriada para funções serverless com conexões curtas. O Render executará um
processo Gunicorn persistente.

Se montar a URL manualmente, caracteres como `@`, `:`, `/`, `#`, `%` e `?` na
senha precisam de URL encoding. A opção mais segura é copiar a URL pronta do
painel do Supabase.

### 4.2 Preparar schema e administrador

O Render gratuito não fornece shell interativo. Prepare o banco pelo computador
local antes do primeiro deploy:

```powershell
$env:DATABASE_URL='COLE_AQUI_A_SESSION_POOLER_URL'
venv\Scripts\python.exe manage.py migrate --noinput
venv\Scripts\python.exe manage.py createsuperuser
Remove-Item Env:DATABASE_URL
```

O `createsuperuser` solicitará username, e-mail e senha sem gravá-los no
repositório.

O comando `seed_admin` também foi endurecido e não possui credenciais-padrão:
ele só funciona quando as três variáveis `SEED_ADMIN_USERNAME`,
`SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` são fornecidas e validadas. Para esta
primeira implantação, o caminho interativo acima continua sendo mais simples e
evita manter uma senha administrativa no ambiente do serviço.

### 4.3 Conferir o banco

No Supabase, abra **Table Editor** e confirme que as tabelas Django foram
criadas. Na máquina local, opcionalmente execute:

```powershell
$env:DATABASE_URL='COLE_AQUI_A_SESSION_POOLER_URL'
venv\Scripts\python.exe manage.py showmigrations
Remove-Item Env:DATABASE_URL
```

Todos os itens necessários devem aparecer marcados com `[X]`.

## 5. Configurar o Supabase Storage

### 5.1 Criar o bucket

1. No Supabase, abra **Storage**.
2. Crie o bucket `parabook-media`.
3. Mantenha o bucket **privado**.

O bucket contém capas e PDFs. Não o torne público para “resolver” erros de
acesso: o backend gera URLs temporárias e continua responsável por verificar se
o usuário pode ler cada obra.

### 5.2 Gerar as credenciais S3

1. Abra **Storage > Settings/Configuration > S3**.
2. Habilite o protocolo S3, se necessário.
3. Gere um novo par de Access Key e Secret Key.
4. Guarde os quatro valores:

```text
SUPABASE_STORAGE_ENDPOINT
SUPABASE_STORAGE_REGION
SUPABASE_STORAGE_ACCESS_KEY
SUPABASE_STORAGE_SECRET_KEY
```

Essas credenciais têm poder de servidor e nunca devem ir para a Vercel ou
receber prefixo `VITE_`.

O backend usa assinatura S3 v4, bucket privado e URLs temporárias com validade
padrão de 900 segundos.

## 6. Criar o backend no Render

### 6.1 Criar pelo Blueprint

1. Certifique-se de que `render.yaml`, `Dockerfile` e `scripts/start.sh` estão
   versionados e enviados ao repositório remoto.
2. Entre no Render.
3. Selecione **New > Blueprint**.
4. Conecte o provedor Git, se ainda não estiver conectado.
5. Selecione o repositório do ParaBook.
6. Confirme o caminho padrão `render.yaml` na raiz.
7. Revise o serviço `parabook-api` e aplique o Blueprint.

Durante a primeira criação, o Render solicitará todas as variáveis marcadas com
`sync: false`. Preencha:

| Variável Render | Origem | Secreta? |
|---|---|---:|
| `FRONTEND_URL` | URL esperada da Vercel | Não |
| `DATABASE_URL` | Session Pooler 5432 do Supabase | Sim |
| `SUPABASE_STORAGE_ENDPOINT` | Configuração S3 do Supabase | Não |
| `SUPABASE_STORAGE_REGION` | Configuração S3 do Supabase | Não |
| `SUPABASE_STORAGE_ACCESS_KEY` | Chave S3 | Sim |
| `SUPABASE_STORAGE_SECRET_KEY` | Segredo S3 | Sim |

Exemplo inicial:

```text
FRONTEND_URL=https://parabook.vercel.app
```

O `SECRET_KEY` é gerado pelo próprio Blueprint. Não crie nem replique uma chave
manualmente se o Render já a gerou.

### 6.2 Variáveis já definidas pelo Blueprint

O repositório configura automaticamente:

```text
DEBUG=False
DATABASE_CONN_MAX_AGE=600
DATABASE_DISABLE_SERVER_SIDE_CURSORS=False
SERVERLESS=False
SUPABASE_STORAGE_ENABLED=True
SUPABASE_STORAGE_BUCKET_NAME=parabook-media
PAYMENTS_ENABLED=False
EMAIL_ENABLED=False
PASSWORD_RESET_ENABLED=False
JWT_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
JWT_COOKIE_SAMESITE=None
CSRF_COOKIE_SAMESITE=None
SESSION_COOKIE_SAMESITE=None
RUN_MIGRATIONS=true
RUN_SEED_ACERVO=true
RUN_SEED_ADMIN=false
GUNICORN_WORKERS=1
GUNICORN_THREADS=2
GUNICORN_TIMEOUT=90
```

Não cadastre chaves Stripe enquanto `PAYMENTS_ENABLED=False`.

### 6.3 Acompanhar o primeiro deploy

Nos logs do Render, a ordem esperada é:

1. construção da imagem Docker;
2. instalação das dependências;
3. `manage.py migrate --noinput`;
4. `manage.py seed_acervo --if-needed` (sem escrita quando o acervo está completo);
5. `manage.py collectstatic --noinput`;
6. inicialização do Gunicorn na variável `PORT` fornecida pelo Render.

O plano gratuito não possui uma etapa de pre-deploy. Por isso as migrations
idempotentes rodam na inicialização. Com uma única instância gratuita, isso é
aceitável. Quando houver plano pago, mova migrations para `preDeployCommand` e
defina `RUN_MIGRATIONS=false` no processo web.

O administrador não é criado automaticamente. Para habilitar `RUN_SEED_ADMIN`
por um único deploy, cadastre antes `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL` e
`SEED_ADMIN_PASSWORD`; depois volte a flag para `false` para que reinicializações
comuns não rotacionem a senha.

### 6.4 Validar o backend isoladamente

Substitua `SEU-SERVICO` pelo hostname criado:

```text
https://SEU-SERVICO.onrender.com/health/
https://SEU-SERVICO.onrender.com/ready/
https://SEU-SERVICO.onrender.com/api/docs/
```

Resultados esperados:

- `/health/`: HTTP 200 e `{"status":"ok","service":"parabook-api"}`;
- `/ready/`: HTTP 200 e `{"status":"ready"}`;
- `/api/docs/`: interface OpenAPI.

`/health/` testa o processo. `/ready/` também consulta o PostgreSQL. Se health
passar e ready retornar 503, investigue `DATABASE_URL`, senha, pooler e região.

## 7. Criar o frontend na Vercel

### 7.1 Importar o monorepositório

1. No painel da Vercel, escolha **Add New > Project**.
2. Importe o mesmo repositório.
3. Em **Root Directory**, clique em **Edit** e selecione `parabook-web`.
4. Confirme:

```text
Framework Preset: Vite
Install Command: npm install ou npm ci
Build Command: npm run build
Output Directory: dist
```

O `vercel.json` dentro de `parabook-web` já configura o framework e o fallback
para que recarregar `/login`, `/perfil` ou qualquer rota React não gere 404.

### 7.2 Configurar a URL da API

Antes do deploy, abra **Settings > Environment Variables** e adicione:

```text
Name: VITE_API_URL
Value: https://SEU-SERVICO.onrender.com/api/v1
Environment: Production
```

`VITE_API_URL` é público por definição: seu valor aparece no JavaScript
compilado. Isso é correto para a URL da API. Nunca use `VITE_` para segredos.

Variáveis Vite são aplicadas no build. Alterar o valor exige um novo deployment;
um deployment antigo não recebe o novo valor retroativamente.

### 7.3 Fazer o deploy

Clique em **Deploy** e aguarde:

```text
npm install/ci
npm run build
publicação de dist/
```

Abra a URL gerada. Se ela não for exatamente a URL colocada anteriormente em
`FRONTEND_URL`, copie a URL definitiva e atualize o Render:

```text
Render > parabook-api > Environment > FRONTEND_URL
```

Salve e faça um novo deploy do backend.

## 8. Como as configurações se alinham

### 8.1 Fluxo da URL

```text
Vercel VITE_API_URL
  = https://SEU-SERVICO.onrender.com/api/v1

Render FRONTEND_URL
  = https://SEU-PROJETO.vercel.app
```

`VITE_API_URL` informa ao navegador onde está o Django. `FRONTEND_URL` informa
ao Django qual origem pode usar cookies, CORS e CSRF, além de compor links e
retornos controlados pelo servidor.

Não inclua `/api/v1` em `FRONTEND_URL`. Não omita `/api/v1` em
`VITE_API_URL`.

### 8.2 Cookies nos domínios gratuitos

`vercel.app` e `onrender.com` são sites diferentes. Para esse cenário:

```text
Secure=True
SameSite=None
CORS_ALLOW_CREDENTIALS=True
FRONTEND_URL com origem HTTPS exata
```

O Axios já usa `withCredentials: true` e obtém o token CSRF em
`/api/v1/auth/csrf/` antes de métodos mutáveis.

Não acrescente `/` final, caminhos ou curingas em `FRONTEND_URL`. Use:

```text
https://parabook.vercel.app
```

e não:

```text
https://*.vercel.app/
https://parabook.vercel.app/login
```

Browsers com bloqueio rigoroso de cookies de terceiros ainda podem impedir a
sessão. A solução duradoura é um domínio próprio comum:

```text
https://app.seudominio.com
https://api.seudominio.com
```

Nesse caso, mude os três `*_SAMESITE` do Render para `Lax` e mantenha os cookies
Secure. Antes de monetizar, essa arquitetura de domínio próprio é recomendada.

### 8.3 Previews da Vercel

Cada branch pode gerar uma URL Preview diferente. Ela não estará automaticamente
autorizada pelo Django, pois produção usa uma origem exata. Para esta primeira
fase, valide autenticação apenas no deployment Production.

Não libere `https://*.vercel.app` indiscriminadamente. Se previews autenticados
se tornarem necessários, defina uma política explícita de origens e ambientes
separados.

## 9. Teste de aceitação em produção

Execute na ordem abaixo.

### 9.1 Infraestrutura

- [ ] `/health/` retorna 200;
- [ ] `/ready/` retorna 200;
- [ ] `/api/docs/` abre;
- [ ] logs do Render não mostram migrations pendentes;
- [ ] Vercel carrega a Home por HTTPS;
- [ ] recarregar uma rota interna não retorna 404.

### 9.2 Autenticação

- [ ] abrir a tela de cadastro;
- [ ] cadastrar um usuário de teste;
- [ ] confirmar login sem tokens no `localStorage`;
- [ ] recarregar a página e continuar autenticado;
- [ ] executar uma alteração de perfil protegida por CSRF;
- [ ] fazer logout;
- [ ] confirmar que uma rota privada volta a exigir login.

No DevTools, confirme que cookies de autenticação são `HttpOnly`, `Secure` e
`SameSite=None` enquanto forem usados os domínios gratuitos.

### 9.3 Banco e mídia

- [ ] criar ou editar um registro e confirmar persistência após cold start;
- [ ] publicar uma capa de teste;
- [ ] enviar um PDF dentro do limite de 5 MiB;
- [ ] confirmar que o objeto aparece no bucket privado;
- [ ] confirmar que um usuário sem permissão não acessa o PDF;
- [ ] confirmar que a URL assinada expira.

### 9.4 Pagamentos bloqueados

- [ ] plano gratuito continua selecionável;
- [ ] botão de plano pago mostra tooltip no hover/foco;
- [ ] clicar em Assinar exibe SweetAlert sem navegar para Stripe;
- [ ] portal de pagamentos exibe SweetAlert;
- [ ] API de checkout pago retorna HTTP 503 e `feature_indisponivel`;
- [ ] nenhuma chave Stripe está cadastrada no Render ou na Vercel.

## 10. Hibernação e inicialização dos serviços

A Vercel entrega a SPA por CDN e não precisa ser acordada. Ao carregar o React,
o `AuthProvider` consulta `/perfis/meu-perfil/`; essa requisição acorda o Render
naturalmente.

O Render gratuito hiberna após 15 minutos sem tráfego. A primeira requisição
seguinte pode levar aproximadamente um minuto. Durante o cold start, o script
também confere migrations e estáticos.

Não use cron, monitor externo ou ping recíproco apenas para impedir a
hibernação. Além de consumir cotas, isso contorna a finalidade do plano gratuito
sem eliminar seus outros limites.

## 11. Diagnóstico de problemas

### Erro 400 `DisallowedHost`

Confira se o Render disponibilizou `RENDER_EXTERNAL_HOSTNAME`. Se estiver
fazendo acesso por outro domínio, inclua esse hostname exato em `ALLOWED_HOSTS`.

### Erro de CORS no navegador

Confira:

- `FRONTEND_URL` é exatamente a origem exibida na barra do navegador;
- usa `https://`;
- não contém caminho nem barra final necessária;
- o backend foi redeployado depois da alteração.

### Login responde 200, mas a sessão some

No DevTools, examine `Set-Cookie` e confirme:

```text
Secure
HttpOnly
SameSite=None
```

Se o navegador informar bloqueio de third-party cookies, teste sem modo privado.
Persistindo o bloqueio, use domínio próprio comum para app e API.

### POST retorna 403 CSRF

1. Abra a aba Network.
2. Confirme que `/api/v1/auth/csrf/` retorna 200.
3. Confirme o cookie CSRF.
4. Confirme o header `X-CSRFToken` no POST.
5. Revise `FRONTEND_URL` e `CSRF_TRUSTED_ORIGINS`.

Não desative o middleware CSRF para corrigir esse erro.

### `/ready/` retorna 503

Revise `DATABASE_URL`:

- host Shared Pooler correto;
- porta 5432;
- usuário no formato fornecido pelo Supabase;
- senha correta e codificada;
- nome do banco geralmente `postgres`;
- projeto Supabase ativo.

### Upload funciona e desaparece depois

Isso indica gravação no filesystem efêmero do Render. Confirme:

```text
SUPABASE_STORAGE_ENABLED=True
```

e as quatro variáveis S3. Nunca use o disco local do Render como storage
persistente.

### Build do Render excede memória ou processo reinicia

O plano gratuito oferece recursos limitados. Mantenha um worker e duas threads.
Observe os logs por `Out of memory`. Não aumente workers sem medir o consumo.

### E-mail não chega

É esperado nesta fase. `EMAIL_ENABLED=False` usa backend dummy e
`PASSWORD_RESET_ENABLED=False` mantém a recuperação de senha desligada. O Render
gratuito bloqueia as portas SMTP 25, 465 e 587. Quando necessário, integre um
provedor por API HTTPS e só então habilite os dois sinalizadores.

## 12. Atualizações e rollback

O fluxo normal de atualização é:

```text
alteração local
  -> testes
  -> commit/push
  -> Vercel recompila o frontend
  -> Render reconstrói o backend
  -> Render aplica migrations e inicia Gunicorn
```

Antes de migrations destrutivas, gere backup no Supabase. Rollback de código não
desfaz automaticamente alterações de schema ou dados.

Se apenas `VITE_API_URL` mudar, faça redeploy da Vercel. Se `FRONTEND_URL`, banco,
storage ou cookies mudarem, faça redeploy do Render.

## 13. Segurança operacional

- mantenha o bucket de PDFs privado;
- não registre `DATABASE_URL`, S3 Secret Key ou `SECRET_KEY` em logs;
- use senhas únicas e um gerenciador de senhas;
- revogue chaves antigas, não apenas as apague do `.env`;
- não habilite Stripe até concluir regras de negócio e testes financeiros;
- não use credenciais administrativas-padrão;
- acompanhe 401, 403, 429 e 5xx nos logs;
- teste restauração de backup, não apenas a existência do backup;
- reveja LGPD antes de inserir dados pessoais reais.

## 14. Quando o projeto começar a gerar receita

Antes de ativar pagamentos:

1. reveja os termos do plano Hobby da Vercel, destinado a uso pessoal e não
   comercial;
2. migre para planos compatíveis com operação comercial;
3. adote domínio próprio para reduzir problemas de cookies;
4. configure e-mail transacional por API HTTPS;
5. crie ambiente de staging;
6. configure backups e teste restore;
7. cadastre novas chaves Stripe somente no Render;
8. valide assinatura do webhook, idempotência, cancelamento e reembolso;
9. só então altere `PAYMENTS_ENABLED=True`.

## 15. Referências oficiais

- Render Blueprints: <https://render.com/docs/blueprint-spec>
- Render Free: <https://render.com/docs/free>
- Vercel com Vite: <https://vercel.com/docs/frameworks/frontend/vite>
- Vercel em monorepositórios: <https://vercel.com/docs/monorepos>
- Variáveis da Vercel: <https://vercel.com/docs/environment-variables>
- Vercel Hobby: <https://vercel.com/docs/plans/hobby>
- Supabase — conexão PostgreSQL: <https://supabase.com/docs/guides/database/connecting-to-postgres>
- Supabase Storage S3: <https://supabase.com/docs/guides/storage/s3/compatibility>

---

Última revisão deste tutorial: 4 de setembro de 2026.
