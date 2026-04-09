    // 📚 TODOS OS LIVROS
    const livros = {

    // FILOSOFIA
    confissoes: {
        nome: "Confissões",
        autor: "Santo Agostinho",
        caminho: "/livros/Filosofia/livro1.pdf",
        capa: "/livros/capas_livros/confiçõesdesantoaugustinho.png"
    },
    republica: {
        nome: "A República",
        autor: "Platão",
        caminho: "/livros/Filosofia/livro2.pdf",
        capa: "/livros/capas_livros/arepublica.png"
    },
    pensamento_inquieto: {
        nome: "Pensamento Inquieto",
        autor: "Ricardo Evangelista Brandão",
        caminho: "/livros/Filosofia/livro3.pdf",
        capa: "/livros/capas_livros/pensamentoinquieto.png"
    },
    historia_filosofia_antiga: {
        nome: "Introdução à História da Filosofia Antiga",
        autor: "João Hobuss",
        caminho: "/livros/Filosofia/livro4.pdf",
        capa: "/livros/capas_livros/filosofiaantiga.png"
    },
    filosofia_medieval: {
        nome: "Filosofia Medieval",
        autor: "Manoel Vasconcelos",
        caminho: "/livros/Filosofia/livro5.pdf",
        capa: "/livros/capas_livros/filosofiamedieval.png"
    },
    filosofia_virtudes: {
        nome: "Filosofia das Virtudes",
        autor: "Bruno Aislã Gonçalves",
        caminho: "/livros/Filosofia/livro6.pdf",
        capa: "/livros/capas_livros/filosofiadasvirtudes.png"
    },
    filosofia_emocoes: {
        nome: "Filosofia das Emoções",
        autor: "Felipe Nogueira e Flávio Williges",
        caminho: "/livros/Filosofia/livro7.pdf",
        capa: "/livros/capas_livros/filosofiadasemoções.png"
    },
    filosofia_antiga: {
        nome: "Filosofia Antiga",
        autor: "Cesar Augusto Mathias",
        caminho: "/livros/Filosofia/livro9.pdf",
        capa: "/livros/capas_livros/filosofiaantiga.png"
    },
    direito_privado: {
        nome: "Filosofia do Direito Privado",
        autor: "Peter Benson",
        caminho: "/livros/Filosofia/livro9.pdf",
        capa: "/livros/capas_livros/filosofiadodireitoprivado.png"
    },

    // LITERATURA
    alienista: {
        nome: "O Alienista",
        autor: "Machado de Assis",
        caminho: "/livros/Literatura/livro1.pdf",
        capa: "/livros/capas_livros/alienista.png"
    },
    cortico: {
        nome: "O Cortiço",
        autor: "Aluísio Azevedo",
        caminho: "/livros/Literatura/livro2.pdf",
        capa: "/livros/capas_livros/ocortiço.png"
    },
    memorias_postumas: {
        nome: "Memórias Póstumas de Brás Cubas",
        autor: "Machado de Assis",
        caminho: "/livros/Literatura/livro3.pdf",
        capa: "/livros/capas_livros/memoriaspostumas.png"
    },
    dom_casmurro: {
        nome: "Dom Casmurro",
        autor: "Machado de Assis",
        caminho: "/livros/Literatura/livro4.pdf",
        capa: "/livros/capas_livros/domcasmurro.png"
    },
    contos_lima: {
        nome: "Contos de Lima Barreto",
        autor: "Lima Barreto",
        caminho: "/livros/Literatura/livro5.pdf",
        capa: "/livros/capas_livros/contosdelima.png"
    },
    triste_fim: {
        nome: "Triste Fim de Policarpo Quaresma",
        autor: "Lima Barreto",
        caminho: "/livros/Literatura/livro6.pdf",
        capa: "/livros/capas_livros/tristefim.png"
    },
    guarani: {
        nome: "O Guarani",
        autor: "José de Alencar",
        caminho: "/livros/Literatura/livro7.pdf",
        capa: "/livros/capas_livros/oguarani.png"
    },
    ao_correr_da_pena: {
        nome: "Ao Correr da Pena",
        autor: "José de Alencar",
        caminho: "/livros/Literatura/livro8.pdf",
        capa: "/livros/capas_livros/ocorrerdapena.png"
    },
    helena: {
        nome: "Helena",
        autor: "Machado de Assis",
        caminho: "livros/literatura/livro28.pdf",
        capa: "/livros/capas_livros/helena.png"
    },
    revolucao_bichos: {
        nome: "A Revolução dos Bichos",
        autor: "George Orwell",
        caminho: "/livros/Literatura/livro9.pdf",
        capa: "/livros/capas_livros/arevoluçãodosbichos.png"
    },

    // RELIGIOSOS
    noite_escura: {
        nome: "Noite Escura da Alma",
        autor: "São João da Cruz",
        caminho: "/livros/Religiosos/livro1.pdf",
        capa: "/livros/capas_livros/noiteescuradaalma.png"
    },
    gloria_maria: {
        nome: "Glória de Maria",
        autor: "Santo Afonso Ligório",
        caminho: "/livros/Religiosos/livro2.pdf",
        capa: "/livros/capas_livros/groriasdemaria.png"
    },
    castelo_interior: {
        nome: "O Castelo Interior",
        autor: "Santa Teresa de Jesus",
        caminho: "/livros/Religiosos/livro3.pdf",
        capa: "/livros/capas_livros/ocastelointerior.png"
    },
    amar_servir: {
        nome: "Amar e Servir",
        autor: "Inácio de Loyola",
        caminho: "/livros/Religiosos/livro4.pdf",
        capa: "/livros/capas_livros/amareservir.png"
    },
    imitacao_cristo: {
        nome: "A Imitação de Cristo",
        autor: "Tomás de Kempis",
        caminho: "/livros/Religiosos/livro5.pdf",
        capa: "/livros/capas_livros/imitaçãodecristo.png"
    },
    meditacoes_quaresma: {
        nome: "Meditações para Quaresma",
        autor: "Papa Francisco",
        caminho: "/livros/Religiosos/livro6.pdf",
        capa: "/livros/capas_livros/meditaçãoparaaquaresma.png"
    },
    biblia_catolica: {
        nome: "Bíblia Sagrada Católica",
        autor: "Diversos",
        caminho: "/livros/Religiosos/livro7.pdf",
        capa: "/livros/capas_livros/bibliasagrada.png"
    },
    divina_comedia: {
        nome: "A Divina Comédia",
        autor: "Dante Alighieri",
        caminho: "/livros/Religiosos/livro8.pdf",
        capa: "/livros/capas_livros/adivinacomedia.png"
    },
    tratado_oracao: {
        nome: "Tratado de Oração",
        autor: "Santo Agostinho",
        caminho: "/livros/Religiosos/livro9.pdf",
        capa: "/livros/capas_livros/tratadodeoração.png"
    }
    };

    // ADICIONAR LIVRO
    function adicionarLivro(id) {
    let biblioteca = JSON.parse(localStorage.getItem("biblioteca")) || [];

    if (!livros[id]) {
        console.warn("Livro não encontrado:", id);
        return;
    }

    if (!biblioteca.includes(id)) {
        biblioteca.push(id);
        localStorage.setItem("biblioteca", JSON.stringify(biblioteca));
        alert("Livro adicionado à sua biblioteca!");
    } else {
        alert("Esse livro já está na sua biblioteca!");
    }
    }

    // CARREGAR BIBLIOTECA
function carregarBiblioteca() {
    const container = document.getElementById("lista-livros");
    if (!container) return;

    let biblioteca = JSON.parse(localStorage.getItem("biblioteca")) || [];

    if (biblioteca.length === 0) {
        container.innerHTML = "<p>Você ainda não adicionou nenhum livro.</p>";
        return;
    }

    let html = "";

    biblioteca.forEach(id => {
        const livro = livros[id];
        if (!livro) return;

        // gera a capa automaticamente usando o ID
        const capa = livro.capa;

        html += `
        <div class="card-livro">
            <img src="${capa}" alt="Capa do livro ${livro.nome}">
            <h3>${livro.nome}</h3>
            <p>Autor: ${livro.autor}</p>

            <a href="leitura.html?livro=${id}" class="btn">
                Ler
            </a>
        </div>
        `;
    });

    container.innerHTML = html;
}

    // CARREGAR LEITURA
    function carregarLeitura() {
    const titulo = document.getElementById("titulo");
    if (!titulo) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("livro");

    const livro = livros[id];
    if (!livro) {
        titulo.innerText = "Livro não encontrado";
        return;
    }

    document.getElementById("titulo").innerText = livro.nome;
    document.getElementById("autor").innerText = "Autor: " + livro.autor;
    document.getElementById("pdf").src = livro.caminho;
    }

    // 🚀 EXECUÇÃO
    carregarBiblioteca();
    carregarLeitura();


    function entrarComunidade(tipo) {
    let comunidades = JSON.parse(localStorage.getItem("comunidades")) || [];

    if (!comunidades.includes(tipo)) {
        comunidades.push(tipo);
        localStorage.setItem("comunidades", JSON.stringify(comunidades));
    }

    window.location.href = `acesso-comunidade.html`;
}


const comunidades = {
    filosofia: {
        titulo: "Filosofia",
        descricao: "Discussões sobre ideias e pensamentos filosóficos.",
        posts: [
            {
                titulo: "O que é felicidade?",
                texto: "Na visão de Aristóteles, felicidade está ligada à virtude."
            },
            {
                titulo: "Livro recomendado",
                texto: "Meditações, de Marco Aurélio."
            }
        ]
    },

    literatura: {
        titulo: "Literatura",
        descricao: "Discussões sobre livros e autores.",
        posts: [
            {
                titulo: "Dom Casmurro",
                texto: "O que vocês acham do final?"
            }
        ]
    },

    religioso: {
        titulo: "Religiosos",
        descricao: "Reflexões espirituais.",
        posts: [
            {
                titulo: "Versículo do dia",
                texto: "Tudo posso naquele que me fortalece."
            }
        ]
    }
};

// ENTRAR NA COMUNIDADE
function entrarComunidade(tipo) {
    let comunidadesSalvas =
        JSON.parse(localStorage.getItem("comunidades")) || [];

    if (!comunidadesSalvas.includes(tipo)) {
        comunidadesSalvas.push(tipo);

        localStorage.setItem(
            "comunidades",
            JSON.stringify(comunidadesSalvas)
        );
    }

    window.location.href = "acesso-comunidade.html";
}


// MOSTRAR COMUNIDADES PARTICIPADAS
function mostrarComunidadesSalvas() {
    const container =
        document.getElementById("lista-comunidades-salvas");

    if (!container) return;

    let comunidadesSalvas =
        JSON.parse(localStorage.getItem("comunidades")) || [];

    if (comunidadesSalvas.length === 0) {
        container.innerHTML =
            "<p>Você ainda não entrou em nenhuma comunidade.</p>";
        return;
    }

    let html = "";

    comunidadesSalvas.forEach(tipo => {
        const comunidade = comunidades[tipo];

        html += `
            <div class="post">
                <h4>${comunidade.titulo}</h4>
                <p>${comunidade.descricao}</p>

                <a href="conteudo-comunidade.html?tipo=${tipo}" class="btn">
                    Acessar comunidade
                </a>
            </div>
        `;
    });

    container.innerHTML = html;
}

// EXECUÇÃO
mostrarComunidadesSalvas();


function carregarDetalheComunidade() {
    const titulo = document.getElementById("titulo-comunidade");

    if (!titulo) return;

    const params = new URLSearchParams(window.location.search);
    const tipo = params.get("tipo");

    const comunidade = comunidades[tipo];

    if (!comunidade) return;

    titulo.innerText = comunidade.titulo;

    document.getElementById("descricao-comunidade").innerText =
        comunidade.descricao;

    let html = "";

    comunidade.posts.forEach(post => {
        html += `
            <div class="post">
                <h4>${post.titulo}</h4>
                <p>${post.texto}</p>
            </div>
        `;
    });

    document.getElementById("lista-posts").innerHTML = html;
}

function criarPost() {
    const titulo = document.getElementById("titulo-post").value;
    const texto = document.getElementById("texto-post").value;

    if (!titulo || !texto) return;

    const novoPost = `
        <div class="post">
            <h4>${titulo}</h4>
            <p>${texto}</p>
        </div>
    `;

    document.getElementById("lista-posts").innerHTML += novoPost;
}

carregarDetalheComunidade();