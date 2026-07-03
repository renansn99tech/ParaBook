document.addEventListener("DOMContentLoaded", () => {

    const botao = document.getElementById("mensagemBtn");
    const mensagem = document.getElementById("mensagem");

    botao.addEventListener("click", () => {

        mensagem.innerHTML = `
            <div class="resultado-box">

                <h2>🎉 Parabéns!</h2>

                <p>
                    Você encontrou a página secreta do Parabook.
                </p>

                <p>
                    O Parabook foi criado para conectar leitores,
                    incentivar a troca de conhecimento e aproximar
                    pessoas através dos livros.
                </p>

                <p>
                    📚 Ler é mais do que consumir informação:
                    é descobrir novas ideias, perspectivas e possibilidades.
                </p>

                <p>
                    Obrigado por visitar nosso projeto.
                </p>

            </div>
        `;

        botao.textContent = "✅ Mensagem Revelada";
        botao.disabled = true;

    });

});