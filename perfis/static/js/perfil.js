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
    // EDITAR PERFIL
    // =============================
    document.getElementById("btnEditarPerfil")?.addEventListener("click", async () => {

        const { value: nome } = await Swal.fire({
            title: "Editar nome",
            input: "text",
            inputLabel: "Novo nome",
            inputPlaceholder: "Digite seu nome",
            showCancelButton: true,
            confirmButtonText: "Salvar",
            cancelButtonText: "Cancelar"
        });

        if (nome) {
            document.getElementById("nomePerfil").textContent = nome;

            Swal.fire({
                icon: "success",
                title: "Nome atualizado!",
                timer: 1500,
                showConfirmButton: false
            });
        }
    });

    // =============================
    // EDITAR BIO
    // =============================
    document.getElementById("btnEditarBio")?.addEventListener("click", async () => {

        const { value: bio } = await Swal.fire({
            title: "Editar bio",
            input: "textarea",
            inputLabel: "Nova bio",
            inputPlaceholder: "Digite sua bio",
            showCancelButton: true,
            confirmButtonText: "Salvar",
            cancelButtonText: "Cancelar"
        });

        if (bio) {
            document.querySelector(".bio-text").textContent = bio;

            Swal.fire({
                icon: "success",
                title: "Bio atualizada!",
                timer: 1500,
                showConfirmButton: false
            });
        }
    });

    // =============================
    // TROCAR FOTO
    // =============================
    document.getElementById("btnTrocarFoto")?.addEventListener("click", async () => {

        const { value: foto } = await Swal.fire({
            title: "Trocar foto",
            input: "url",
            inputLabel: "URL da imagem",
            inputPlaceholder: "https://...",
            showCancelButton: true,
            confirmButtonText: "Salvar",
            cancelButtonText: "Cancelar"
        });

        if (foto) {
            document.querySelector(".perfil-avatar").src = foto;

            Swal.fire({
                icon: "success",
                title: "Foto atualizada!",
                timer: 1500,
                showConfirmButton: false
            });
        }
    });

    // =============================
    // REMOVER FAVORITOS
    // =============================
    document.addEventListener("click", (e) => {

        if (e.target.classList.contains("btn-remover-favorito")) {

            e.target.closest(".favorito-card")?.remove();

            Swal.fire({
                icon: "success",
                title: "Removido dos favoritos",
                timer: 1200,
                showConfirmButton: false
            });
        }
    });

    // =============================
    // LOGOUT
    // =============================
    // document.getElementById("btnLogout")?.addEventListener("click", () => {

    //     localStorage.removeItem("usuarioLogado");
    //     window.location.href = "index.html";
    // });

});