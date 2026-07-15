# 📚 ParaBook - Dicionário de Dados (Fase 1)

Este documento mapeia a estrutura do banco de dados relacional do ParaBook após a grande refatoração de unificação de tabelas. O sistema utiliza a abordagem *Soft Delete* para preservação de histórico e *RBAC* (Role-Based Access Control) para isolamento de privilégios.

## 👤 Módulo: Autenticação e Usuários (`usuarios` & `perfis`)

### Tabela: `usuarios_usuario`
Controla os metadados de acesso, termos jurídicos (LGPD) e o nível de privilégio na plataforma.
* **id** (PK): Inteiro auto-incremental.
* **user_auth_id** (FK): Relacionamento 1:1 com a tabela nativa `auth_user` do Django (onde ficam login e senha encriptada).
* **perfil_id** (FK): Relacionamento 1:1 com `perfis_perfil` (Opcional no momento da criação).
* **nome**: Varchar(45). Nome real ou de exibição.
* **tipo**: Varchar(20). Define a role (RBAC): `leitor`, `autor`, `admin`, ou `aguardando_aprovacao`.
* **cpf**: Varchar(14), Unique. Necessário para Autores Independentes (LGPD / Direitos Autorais).
* **termos_aceitos**: Boolean. Registro de aceite dos termos de uso.
* **data_aceite_termos**: DateTime. Timestamp exato da concordância (Auditoria).
* **notificacao_autor**: Boolean. Flag de disparo de celebração visual ao aprovar upgrade.

### Tabela: `perfis_perfil`
Controla a vitrine social do usuário para a rede.
* **id** (PK): Inteiro auto-incremental.
* **usuario_id** (FK): Relacionamento 1:1 com `auth_user`.
* **foto**: Varchar/ImageField. URL da imagem de avatar no storage (ex: Supabase).
* **bio**: Text. Biografia escrita pelo usuário.
* **perfil_privado**: Boolean. Se True, oculta o perfil em buscas públicas.

---

## 📖 Módulo: Acervo e Literatura (`biblioteca`)

### Tabela: `categorias`
Armazena os gêneros literários padronizados do sistema.
* **id** (PK): Inteiro auto-incremental.
* **nome**: Varchar(50), Unique. (Ex: Filosofia, Literatura, Exatas).

### Tabela: `livros` (A Tabela Unificada)
O coração da plataforma. Armazena tanto obras de Domínio Público quanto os envios de Autores Independentes.
* **id** (PK): Inteiro auto-incremental.
* **titulo**: Varchar(255).
* **categoria_id** (FK): Relacionamento N:1 com `categorias`.
* **autor**: Varchar(150). Nome do autor da obra.
* **origem**: Varchar(50). Define se é `dominio_publico` ou `autor_independente`.
* **status**: Varchar(20). Máquina de estados: `pendente`, `publicado`, `rejeitado` ou `removido`.
* **ano_publicacao**: SmallInt. 
* **paginas**: Inteiro. Lidas automaticamente pelo PyPDF2 ou informadas manualmente.
* **isbn**: Varchar(20), Nullable.
* **capa / pdf**: Varchar/FileField. Caminhos dos arquivos no storage.
* **avaliacao**: Decimal(3,2). Média calculada das notas (Cache de performance).
* **data_remocao**: DateTime, Nullable. Usado para **Soft Delete**. Obras aqui ficam na Lixeira por 7 dias.

### Tabela: `solicitacoes_publicacao`
Tabela de fila para moderação. Evita que livros poluam a home antes da aprovação do Admin.
* **id** (PK): Inteiro auto-incremental.
* **livro_id** (FK): Relacionamento 1:1 com `livros`. Cascade na exclusão.
* **status**: Varchar(20). Replica o estado da aprovação.
* **data_envio**: DateTime. 

---

## 👥 Módulo: Social e Moderação (`comunidades` & `dashboard`)

### Tabela: `comunidades_comunidade`
Salas de debate e interação criadas por usuários ou pelo sistema.
* **id** (PK): Inteiro auto-incremental.
* **nome**: Varchar(100), Unique.
* **descricao**: Text.
* **criador_id** (FK): Relacionamento N:1 com `auth_user`.
* **criada_por_sistema**: Boolean. Se True, recebe selo oficial e não pode ser apagada por usuários.
* **em_manutencao**: Boolean. Bloqueia temporariamente o acesso à sala.
* **total_denuncias**: Inteiro. Score negativo de reputação da sala.

### Tabela: `denuncias` (Denúncias de Livros)
* **id** (PK): Inteiro auto-incremental.
* **livro_id** (FK): Relacionamento N:1 com `livros`.
* **usuario_id** (FK): Relacionamento N:1 com `auth_user` (Quem denunciou).
* **motivo**: Varchar(100). (Ex: Plágio, Pirataria, Ofensivo).
* **arquivada**: Boolean. (Falso Positivo).
* **data_arquivamento**: DateTime, Nullable. **Soft Delete**. Retenção de 30 dias na Lixeira.

### Tabela: `denuncias_comunidades`
* **id** (PK): Inteiro auto-incremental.
* **comunidade_id** (FK): Relacionamento N:1 com `comunidades_comunidade`.
* **usuario_id** (FK): Relacionamento N:1 com `auth_user`.
* **motivo**: Varchar(100).
* **data_denuncia**: DateTime.
