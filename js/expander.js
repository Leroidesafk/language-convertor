const expander = document.querySelector(".text-expander");
const moreText = document.querySelector(".more-text");
const label = expander.querySelector(".label");

expander.addEventListener("click", () => {
    const isOpen = expander.classList.toggle("active");

    moreText.classList.toggle("show");

    label.textContent = isOpen ? "Read less" : "Read more";

    expander.setAttribute("aria-expanded", isOpen);
});