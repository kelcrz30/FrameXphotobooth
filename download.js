document.addEventListener("DOMContentLoaded", function () {
  const toggleButton = document.getElementById("darkModeToggle");
  toggleButton.addEventListener("click", function () {
      document.body.classList.toggle("dark-mode");
  });
});