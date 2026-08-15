# 📚 ParaBook - Plataforma de Economia Criativa Literária

> **Repositório do Projeto Integrador - Programador Full Stack (Senac)**

O **ParaBook** nasceu como uma resposta à necessidade de modernizar a interação com o conhecimento. Indo muito além de um simples gerenciador de acervo, a plataforma se posiciona como um **ecossistema literário imersivo**, unindo leitores casuais, autores independentes e administradores em um ambiente seguro, responsivo e de alta performance.

---

## 🎯 Proposta de Valor: Como já atendemos nossos usuários

Atualmente, o ParaBook já oferece uma experiência sólida e de alto valor agregado para seus usuários:
- **Para Leitores:** Uma interface limpa (Dark Glassmorphism) livre de distrações, com navegação fluida pelo acervo (Filosofia, Literatura, Religiosos), controle de perfil e comunicação direta através de FAQs e comunidades.
- **Para Autores Independentes:** Um ambiente isolado e seguro para publicação e futura monetização, fomentando a economia criativa sem intermediários.
- **Para Administradores:** Dashboards de controle e gestão de acesso robusto (RBAC), garantindo moderação eficiente da plataforma.

---

## 🧩 Arquitetura de Apps (Modularidade Django)

O backend foi arquitetado com base no princípio de responsabilidade única, dividindo o sistema em módulos (apps) independentes, o que facilita manutenções e garante a escalabilidade do sistema:

- `usuarios` / `perfis`: Gestão rigorosa de autenticação, RBAC e perfis customizados.
- `livros` / `obras`: O núcleo do acervo, com categorização inteligente e vitrines interativas.
- `dashboard`: Painéis analíticos e métricas para gestão.
- `mensagens` / `comunidades` / `comentarios`: Toda a camada social, conectando os usuários do ecossistema.

---

## 🚀 Como executar o projeto localmente

**1. Clone o repositório:**
```bash
git clone https://github.com/rsnproj2/ProjetoIntegrador.git
cd ProjetoIntegrador
```

**2. Crie e ative o ambiente virtual:**
```bash
python -m venv venv
# No Windows:
venv\Scripts\activate
```

**3. Instale as dependências e rode o servidor:**
```bash
pip install -r requirements.txt
python manage.py runserver
```

---

## 💻 Stack Tecnológico Atual

| Camada | Tecnologias |
| :--- | :--- |
| **Front-end** | HTML5, CSS3 (Vanilla / Flexbox / CSS Grid), JS Puro |
| **Design System** | Dark Glassmorphism, UI/UX Mobile-First, Micro-interações |
| **Back-end** | Python 3, Django |
| **Banco de Dados** | MySQL (Produção/Staging), SQLite (Dev) |

---

## 🗺️ Roadmap e Status do Projeto

* **Março a Maio/2026 (Finalizado):** Modelagem do banco, interface visual modernizada, front-end finalizado e integração base.
* **Maio a Junho/2026 (Finalizado):** Implementação completa do controle de acesso, perfis, proteção de rotas, exclusão transacional e dashboard.
* **Julho/2026 (Atual):** Integração e consumo de APIs externas. Preparação do ecossistema.
* **Próximos Passos (Curto/Médio Prazo):**
  - Desacoplamento via **Django REST Framework**.
  - Novo Front-end focado em **React/Next.js**.
  - Criação do aplicativo nativo em **Expo/React Native**.
  - Implementação de Marketplace para livros físicos.

---

## 👥 Equipe Desenvolvedora

* **Renan**
* **Rodrigo**
* **Arthur**