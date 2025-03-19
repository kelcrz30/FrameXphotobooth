window.addEventListener("scroll", function() {
    let scrollPosition = window.scrollY;
    document.getElementById("parallax").style.transform = `translateY(${scrollPosition * 0.5}px)`;
});