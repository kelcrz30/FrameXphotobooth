document.addEventListener("DOMContentLoaded", () => {
    const darkModeToggle = document.getElementById("darkModeToggle");
    const isDarkMode = localStorage.getItem("dark-mode") === "enabled";

    // Apply dark mode if enabled
    if (isDarkMode) {
        document.body.classList.add("dark-mode");
    }

    // Only add event listener if dark mode toggle exists on the page
    if (darkModeToggle) {
        darkModeToggle.checked = isDarkMode;

        darkModeToggle.addEventListener("change", () => {
            if (darkModeToggle.checked) {
                document.body.classList.add("dark-mode");
                localStorage.setItem("dark-mode", "enabled");
            } else {
                document.body.classList.remove("dark-mode");
                localStorage.setItem("dark-mode", "disabled");
            }
        });
    }
});