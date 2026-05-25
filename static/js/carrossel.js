const cardsContainer = document.querySelector(".card-carousel");
const cardsController = document.querySelector(".card-carousel + .card-controller")

class DraggingEvent {
    constructor(target = undefined) {
        this.target = target;
    }

    event(callback) { }
    getDistance(callback) { }
}

// ===============================
// CAROUSEL
// ===============================

class CardCarousel extends DraggingEvent {
    constructor(container, controller = undefined) {
        super(container)

        this.container = container
        this.gap = 5;

        this.controllerElement = controller
        this.cards = container.querySelectorAll(".card")

        this.centerIndex = (this.cards.length - 1) / 2;
        this.cardWidth = this.cards[0].offsetWidth / this.container.offsetWidth * 100
        this.xScale = {};

        window.addEventListener("resize", this.updateCardWidth.bind(this))

        if (this.controllerElement) {
            this.controllerElement.addEventListener("keydown", this.controller.bind(this))
        }

        this.build()
    }

    updateCardWidth() {
        this.cardWidth = this.cards[0].offsetWidth / this.container.offsetWidth * 100
        this.build()
    }

    build() {
        for (let i = 0; i < this.cards.length; i++) {
            const x = i - this.centerIndex;
            const scale = this.calcScale(x)
            const scale2 = this.calcScale2(x)
            const zIndex = -(Math.abs(i - this.centerIndex))
            const leftPos = this.calcPos(x, scale2)

            this.xScale[x] = this.cards[i]

            this.updateCards(this.cards[i], {
                x: x,
                scale: scale,
                leftPos: leftPos,
                zIndex: zIndex
            })
        }
    }

    controller(e) {
        const temp = { ...this.xScale };

        if (e.keyCode === 39) {
            for (let x in this.xScale) {
                const newX = (parseInt(x) - 1 < -this.centerIndex)
                    ? this.centerIndex
                    : parseInt(x) - 1;

                temp[newX] = this.xScale[x]
            }
        }

        if (e.keyCode == 37) {
            for (let x in this.xScale) {
                const newX = (parseInt(x) + 1 > this.centerIndex)
                    ? -this.centerIndex
                    : parseInt(x) + 1;

                temp[newX] = this.xScale[x]
            }
        }

        this.xScale = temp;

        for (let x in temp) {
            const scale = this.calcScale(x),
                scale2 = this.calcScale2(x),
                leftPos = this.calcPos(x, scale2),
                zIndex = -Math.abs(x)

            this.updateCards(this.xScale[x], {
                x: x,
                scale: scale,
                leftPos: leftPos,
                zIndex: zIndex
            })
        }
    }

    calcPos(x, scale) {
        const base = 50; // centro do carrossel
        const offset = x * (this.cardWidth * 0.8 + this.gap);

        return base + offset - (this.cardWidth / 2);
    }

updateCards(card, data) {
    if (data.x || data.x == 0) {
        card.setAttribute("data-x", data.x)
    }

    if (data.scale || data.scale == 0) {
        card.style.transform = `scale(${data.scale}) translateY(${Math.abs(data.x) * 10}px)`
        card.style.opacity = data.scale === 0 ? 0 : 1
    }

    if (data.leftPos) {
        card.style.left = `${data.leftPos}%`
    }

    if (data.zIndex || data.zIndex == 0) {
        if (data.zIndex == 0) {
            card.classList.add("highlight")
        } else {
            card.classList.remove("highlight")
        }
        card.style.zIndex = data.zIndex
    }
}

calcScale2(x) {
    if (x <= 0) {
        return 1 + (1 / 5 * x)
    } else {
        return 1 - (1 / 5 * x)
    }
}

calcScale(x) {
    const formula = 1 - 0.15 * Math.pow(x, 2)
    return formula <= 0 ? 0 : formula
}
}

// ===============================
// INICIALIZAÇÃO
// ===============================

const carousel = new CardCarousel(cardsContainer)

// ===============================
// BOTÕES LATERAIS (ÚNICA INTERAÇÃO)
// ===============================

const btnLeft = document.querySelector(".carousel-btn.left")
const btnRight = document.querySelector(".carousel-btn.right")

btnLeft.addEventListener("click", () => {
    carousel.controller({ keyCode: 37 })
})

btnRight.addEventListener("click", () => {
    carousel.controller({ keyCode: 39 })
})