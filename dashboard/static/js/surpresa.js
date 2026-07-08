document.addEventListener("DOMContentLoaded", () => {
    const botao = document.getElementById("mensagemBtn");
    const mensagemContainer = document.getElementById("mensagem");

    function dispararConfetes() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let particulas = [];
        const cores = ['#0d6efd', '#22c55e', '#eab308', '#ec4899'];
        for (let i = 0; i < 100; i++) {
            particulas.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 10,
                radius: Math.random() * 5 + 4,
                color: cores[Math.floor(Math.random() * cores.length)],
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 15 - 10,
                gravity: 0.2,
                opacity: 1
            });
        }
        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particulas.forEach((p, index) => {
                p.vy += p.gravity; p.x += p.vx; p.y += p.vy; p.opacity -= 0.01;
                ctx.beginPath(); ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity;
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
                if (p.opacity <= 0) particulas.splice(index, 1);
            });
            if (particulas.length > 0) requestAnimationFrame(render);
        }
        render();
    }

    botao.addEventListener("click", () => {
        botao.textContent = "⌛ Decodificando...";
        botao.disabled = true;

        const box = document.createElement("div");
        box.className = "resultado-box";
        mensagemContainer.appendChild(box);

        const textoCompleto = "🎉 Parabéns!\n\nVocê encontrou a página secreta do Parabook.\n\nO Parabook foi criado para conectar leitores, incentivar a troca de conhecimento e aproximar pessoas através dos livros.\n\n📚 Ler é mais do que consuming informação: é descobrir novas ideias, perspectivas e possibilidades.\n\nObrigado por visitar nosso projeto.";
        let i = 0;
        
        function digitar() {
            if (i < textoCompleto.length) {
                const caractere = textoCompleto.charAt(i);
                if (caractere === "\n") {
                    box.innerHTML += "<br>";
                } else {
                    box.innerHTML += caractere;
                }
                i++;
                setTimeout(digitar, 15);
            } else {
                botao.textContent = "✅ Mensagem Revelada";
                dispararConfetes();
            }
        }
        digitar();
    });
});