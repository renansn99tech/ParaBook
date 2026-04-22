    // 📚 BASE DE LIVROS
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
        caminho: "livros/Filosofia/livro2.pdf",
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
    },

    // CIENCIAS_EXATAS
    introducao_economia: {
        nome: "Introdução Economia",
        autor: "Carlos Magno Mendes",
        caminho: "/livros/cienecia_exata/livro1.pdf",
        capa: "/livros/capas_livros/introduçãoeconomia.png"
    },
    construcoes_geometricas: {
        nome: "Construções Geometricas",
        autor: "Jorge Luis Costa",
        caminho: "/livros/cienecia_exata/livro2.pdf",
        capa: "/livros/capas_livros/construçõesgeometricas.png"
    },
    o_simbolo_e_arealidade: {
        nome: "O Simbolo e a Realidade",
        autor: "Ricardo Mendes",
        caminho: "/livros/cienecia_exata/livro3.pdf",
        capa: "/livros/capas_livros/osimboloearealidade.png"
    },
    astronomia: {
        nome: "Astronomia",
        autor: "Salvador Nogueira",
        caminho: "/livros/cienecia_exata/livro4.pdf",
        capa: "/livros/capas_livros/astronomia.png"
    },

    // INFANTIS
    fabulas_do_escopo: {
        nome: "Fabulas do Escopo",
        autor: "Carlos Pinheiro",
        caminho: "/livros/livros_infantis/fabulasdoescopo.pdf",
        capa: "/livros/capas_livros/fabulasdoescopo.png"
    },
    misterio_no_expresso: {
        nome: "Mistério no Expresso",
        autor: "Milson Almeida",
        caminho: "/livros/livros_infantis/misterionoexpresso.pdf",
        capa: "/livros/capas_livros/misterionoexpresso.png"
    },
    cem_historia: {
        nome: "100 historia",
        autor: "Alvaro Magalhães",
        caminho: "/livros/livros_infantis/100historia.pdf",
        capa: "/livros/capas_livros/100historia.png"
    },
    
    }; // mantém exatamente como você já tem
    
    // ADICIONAR LIVRO
    function adicionarLivro(id) {
    let biblioteca = JSON.parse(localStorage.getItem("biblioteca") || "[]");
    if (biblioteca.includes(id)) {
        alert("Este livro já está na sua estante!");
        return;
    }
    biblioteca.push(id);
    localStorage.setItem("biblioteca", JSON.stringify(biblioteca));
    alert("Livro adicionado à sua estante! 📚");
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
        html += `
    <div class="card-livro">
    <img src="${livro.capa}" alt="${livro.nome}">
    <h3>${livro.nome}</h3>
    <p>Autor: ${livro.autor}</p>
    <a href="leitura.html?livro=${id}" class="btn">Ler</a>
    </div>
        `;
    });
    container.innerHTML = html;
    }
    // EXECUÇÃO SEGURA
    document.addEventListener("DOMContentLoaded", () => {
    carregarBiblioteca();
    });