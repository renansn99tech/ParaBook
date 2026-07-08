document.addEventListener("DOMContentLoaded", () => {

    // =============================
    // TEMA
    // =============================
    const temaSalvo = localStorage.getItem("theme");

    if (temaSalvo === "light") {
        document.body.classList.add("light-mode");
    }

    // =============================
    // ABAS
    // =============================
    const botoes = document.querySelectorAll(".tab-btn");
    const conteudos = document.querySelectorAll(".tab-content");

    botoes.forEach(btn => {
        btn.addEventListener("click", () => {
            botoes.forEach(b => b.classList.remove("active"));
            conteudos.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");

            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add("active");
        });
    });

    // =============================
    // ALTERAR SENHA
    // =============================
    document.getElementById("btnAlterarSenha")?.addEventListener("click", async () => {

        const { value: novaSenha } = await Swal.fire({
            title: "Nova senha",
            input: "password",
            inputLabel: "Digite sua nova senha",
            inputPlaceholder: "Nova senha",
            confirmButtonText: "Salvar",
            showCancelButton: true,
            cancelButtonText: "Cancelar"
        });

        if (!novaSenha) return;

        Swal.fire({
            icon: "success",
            title: "Senha alterada!",
            timer: 1500,
            showConfirmButton: false
        });
    });

    // =============================
    // EXCLUIR CONTA
    // =============================
    document.getElementById("btnExcluirConta")?.addEventListener("click", async () => {

        const resultado = await Swal.fire({
            title: "Tem certeza?",
            text: "Essa ação não poderá ser desfeita.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonText: "Cancelar",
            confirmButtonText: "Excluir"
        });

        if (resultado.isConfirmed) {

            Swal.fire({
                icon: "success",
                title: "Conta excluída!",
                timer: 1500,
                showConfirmButton: false
            });
        }
    });

    // =============================
    // EDITAR BIO
    // =============================
    // Procure o evento do botão de biografia (ex: btnTrocarBio ou similar)
    document.getElementById("btnEditarBio")?.addEventListener("click", async () => {
        
        // Pega o texto atual da bio para exibir como valor padrão no input
        const bioAtual = document.querySelector(".sobre-texto")?.innerText || "";

        const { value: novaBio } = await Swal.fire({
            title: "Editar Biografia",
            input: "textarea",
            inputLabel: "Fale um pouco sobre você",
            inputValue: bioAtual,
            inputAttributes: {
                maxlength: 500,
                rows: 4
            },
            showCancelButton: true,
            confirmButtonText: "Salvar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: '#5C3B2E' // Mantendo sua paleta elegante
        });

        // Se o usuário digitou algo e confirmou
        if (novaBio !== undefined) {
            // Criamos um formulário virtual (FormData) para enviar os dados via AJAX para o Django
            const formData = new FormData();
            formData.append("bio", novaBio);
            // Importante: Adicionar o token CSRF que o Django exige para segurança
            formData.append("csrfmiddlewaretoken", document.querySelector('[name=csrfmiddlewaretoken]').value);

            try {
                // Envia a nova bio para a view de perfil pessoal
                const response = await fetch(window.location.href, {
                    method: "POST",
                    body: formData
                });

                if (response.ok) {
                    // Atualiza o texto na tela instantaneamente sem precisar recarregar
                    if (document.querySelector(".sobre-texto")) {
                        document.querySelector(".sobre-texto").innerText = novaBio || "Nenhuma biografia cadastrada.";
                    }

                    Swal.fire({
                        icon: "success",
                        title: "Biografia atualizada!",
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error();
                }
            } catch (error) {
                Swal.fire({
                    icon: "error",
                    title: "Erro ao salvar",
                    text: "Não foi possível atualizar sua biografia no momento."
                });
            }
        }
    });

    // =============================
    // TROCAR FOTO (PERSISTENTE)
    // =============================

    document.getElementById("btnTrocarFoto")?.addEventListener("click", () => {
        // Quando clica na câmera, "clicamos" no input oculto via JavaScript
        document.getElementById("inputFotoOculto").click();
    });

    document.getElementById("inputFotoOculto")?.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return; // Se o usuário cancelar a janela, não faz nada

        const formData = new FormData();
        formData.append("foto", file); // Anexa o arquivo físico
        formData.append("csrfmiddlewaretoken", document.querySelector('[name=csrfmiddlewaretoken]').value);

        try {
            const response = await fetch(window.location.href, {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                Swal.fire({
                    icon: "success",
                    title: "Foto atualizada!",
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Recarrega a página para o Django renderizar a nova imagem processada
                    window.location.reload(); 
                });
            }
        } catch (error) {
            Swal.fire({ icon: "error", title: "Erro ao fazer upload da imagem." });
        }
    });

    // =============================
    // REMOVER FOTO DE PERFIL
    // =============================
    document.getElementById("btnRemoverFoto")?.addEventListener("click", async () => {
        const result = await Swal.fire({
            title: "Remover foto?",
            text: "Você voltará a usar o avatar padrão.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#374151',
            confirmButtonText: 'Sim, remover',
            cancelButtonText: 'Cancelar',
            background: '#1e293b', color: '#f8fafc'
        });

        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append("remover_foto", "true");
            formData.append("csrfmiddlewaretoken", document.querySelector('[name=csrfmiddlewaretoken]').value);

            try {
                const response = await fetch(window.location.href, {
                    method: "POST",
                    body: formData
                });

                if (response.ok) {
                    window.location.reload(); // Recarrega para mostrar o avatar padrão
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Erro ao remover a imagem." });
            }
        }
    });

});

// ============================================================
// Removendo os livros Favoritos na aba Favoritos do Perfil - Fora do DOMContentLoaded
// ============================================================

function removerFavoritoDoPerfil(botao, urlToggle) {
    Swal.fire({
        title: 'Remover dos Favoritos?',
        text: "O livro continuará na sua estante, mas sairá desta lista.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, remover',
        cancelButtonText: 'Cancelar',
        background: '#1e293b', color: '#f8fafc'
    }).then((result) => {
        if (result.isConfirmed) {
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || "";
            
            fetch(urlToggle, {
                method: "POST",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRFToken": csrfToken,
                    "Content-Type": "application/json"
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Pega o card inteiro do livro e faz uma animação de sumiço
                    const card = botao.closest('.favorito-card');
                    card.style.transition = "all 0.4s ease";
                    card.style.opacity = "0";
                    card.style.transform = "scale(0.8)";
                    
                    setTimeout(() => {
                        card.remove();
                        // Opcional: Se a tela ficar sem favoritos, você pode dar um reload suave
                        // window.location.reload(); 
                    }, 400);
                }
            });
        }
    });
}