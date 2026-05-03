// carregar componente
fetch("components/mobile-navbar.html")
    .then(res => res.text())
    .then(data => {
        document.getElementById("mobile-navbar-container").innerHTML = data;

        initMobileNavbar();
    });

function initMobileNavbar() {
    const openMenu = document.getElementById("openMenu");
    const mobileMenu = document.getElementById("mobileMenu");
    const overlay = document.getElementById("overlay");

    if (!openMenu) return;

    openMenu.addEventListener("click", () => {
        mobileMenu.classList.add("active");
        overlay.classList.add("active");
    });

    overlay.addEventListener("click", () => {
        mobileMenu.classList.remove("active");
        overlay.classList.remove("active");
    });
}