document
.getElementById("quizForm")
.addEventListener("submit", function(event){

    event.preventDefault();

    const respostas = document.querySelectorAll(
        "input[type='radio']:checked"
    );

    const pontos = {
        conhecimento:0,
        fantasia:0,
        romance:0,
        carreira:0
    };

    respostas.forEach(resposta=>{
        pontos[resposta.value]++;
    });

    let vencedor = Object.keys(pontos).reduce((a,b)=>
        pontos[a] > pontos[b] ? a : b
    );

    let perfil = "";
    let descricao = "";

    if(vencedor==="conhecimento"){
        perfil="🧠 Explorador do Conhecimento";
        descricao="Você gosta de aprender e descobrir novas ideias.";
    }

    if(vencedor==="fantasia"){
        perfil="🐉 Viajante da Imaginação";
        descricao="Você gosta de aventuras e mundos fantásticos.";
    }

    if(vencedor==="romance"){
        perfil="❤️ Colecionador de Histórias";
        descricao="Você aprecia emoções e conexões humanas.";
    }

    if(vencedor==="carreira"){
        perfil="🚀 Leitor de Evolução";
        descricao="Você busca crescimento pessoal e profissional.";
    }

    document.getElementById("resultado").innerHTML=`
        <div class="resultado-box">
            <h2>${perfil}</h2>
            <p>${descricao}</p>
            <p><strong>Parabéns por participar da experiência Parabook!</strong></p>
        </div>
    `;
});