document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;

    const form = searchInput.closest("form");

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        // Redirect to search.html with query parameter
        window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}&page=1`;
    });
});