    // Inicializa o carrossel
    function initCarousel() {
    const carousel = document.querySelector('.carousel-content');
    const items = document.querySelectorAll('.carousel-item');
    const itemWidth = items[0].offsetWidth + 32; 
    let currentPosition = 0;

    // Adiciona eventos de clique aos botões
    document.querySelector('.carousel-button.prev').addEventListener('click', () => {
        currentPosition = (currentPosition + itemWidth) % (items.length * itemWidth);
        carousel.style.transform = `translateX(${-currentPosition}px)`;
    });

    document.querySelector('.carousel-button.next').addEventListener('click', () => {
        currentPosition = (currentPosition - itemWidth + items.length * itemWidth) % (items.length * itemWidth);
        carousel.style.transform = `translateX(${-currentPosition}px)`;
    });
    }

    document.addEventListener('DOMContentLoaded', initCarousel);