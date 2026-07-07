function dispararConfetes() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particulas = [];
    const cores = ['#0d6efd', '#22c55e', '#eab308', '#ec4899', '#3b82f6'];

    for (let i = 0; i < 120; i++) {
        particulas.push({
            x: canvas.width / 2,
            y: canvas.height / 2 - 50,
            radius: Math.random() * 6 + 4,
            color: cores[Math.floor(Math.random() * cores.length)],
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.7) * 12 - 5,
            gravity: 0.25,
            opacity: 1
        });
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particulas.forEach((p, index) => {
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.opacity -= 0.015;

            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            if (p.opacity <= 0) particulas.splice(index, 1);
        });

        if (particulas.length > 0) {
            requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    render();
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("quizForm");
    const progressBar = document.getElementById("progressBar");
    const totalPerguntas = 3;

    form.addEventListener("change", () => {
        const respondidas = new Set();
        form.querySelectorAll("input[type='radio']:checked").forEach(input => {
            respondidas.add(input.name);
        });
        const percentual = (respondidas.size / totalPerguntas) * 100;
        progressBar.style.width = `${percentual}%`;
    });
});

document.getElementById("quizForm").addEventListener("submit", function(event){
    event.preventDefault();
    const respostas = document.querySelectorAll("input[type='radio']:checked");
    const pontos = { conhecimento: 0, fantasia: 0, romance: 0, carreira: 0 };

    respostas.forEach(resposta => { pontos[resposta.value]++; });
    let vencedor = Object.keys(pontos).reduce((a, b) => pontos[a] > pontos[b] ? a : b);

    let perfil = "", descricao = "";
    if(vencedor === "conhecimento"){
        perfil = "🧠 Explorador do Conhecimento";
        descricao = "Você gosta de aprender, decifrar códigos e descobrir novas ideias.";
    } else if(vencedor === "fantasia"){
        perfil = "🐉 Viajante da Imaginação";
        descricao = "Você gosta de aventuras épicas e mundos fantásticos.";
    } else if(vencedor === "romance"){
        perfil = "❤️ Colecionador de Histórias";
        descricao = "Você aprecia profundidade emocional e conexões humanas reais.";
    } else if(vencedor === "carreira"){
        perfil = "🚀 Leitor de Evolução";
        descricao = "Você busca crescimento pessoal, profissional e maestria técnica.";
    }

    document.getElementById("resultado").innerHTML = `
        <div class="resultado-box">
            <h2>${perfil}</h2>
            <p>${descricao}</p>
            <p style="margin-top:12px; font-size:0.9rem; color:#166534;">
                <strong>✨ Parabéns por participar da experiência Parabook!</strong>
            </p>
        </div>
    `;
    dispararConfetes();
});