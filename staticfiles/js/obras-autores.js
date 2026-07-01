    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileName.textContent = "Arquivo: " + fileInput.files[0].name;
        }
    });

document.getElementById("formObra")?.addEventListener("submit", function() {
    alert("Livro enviado com sucesso!");
});