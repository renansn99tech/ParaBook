document.addEventListener("DOMContentLoaded", () => {

    const cardsContainer = document.querySelector(".card-carousel");

    if (!cardsContainer) return;

    class CardCarousel {
        constructor(container) {
            this.container = container;
            this.cards = container.querySelectorAll(".card");

            this.currentIndex = Math.floor(this.cards.length / 2);

            this.update();
        }

        update() {
            this.cards.forEach((card, index) => {

                const offset = index - this.currentIndex;
                const scale = 1 - Math.abs(offset) * 0.2;

                card.style.left = `${50 + offset * 20}%`;
                card.style.transform = `translate(-50%, -50%) scale(${scale})`;
                card.style.zIndex = 10 - Math.abs(offset);
                card.style.opacity = scale <= 0 ? 0 : 1;

                card.classList.remove("highlight");
                if (offset === 0) {
                    card.classList.add("highlight");
                }

            });
        }

        next() {
            this.currentIndex = (this.currentIndex + 1) % this.cards.length;
            this.update();
        }

        prev() {
            this.currentIndex =
                (this.currentIndex - 1 + this.cards.length) % this.cards.length;
            this.update();
        }
    }

    const carousel = new CardCarousel(cardsContainer);

    // BOTÕES
    document.querySelector(".carousel-btn.right")
        ?.addEventListener("click", () => carousel.next());

    document.querySelector(".carousel-btn.left")
        ?.addEventListener("click", () => carousel.prev());

});