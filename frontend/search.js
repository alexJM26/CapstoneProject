document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");

    if (!searchInput) return;

    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            const query = searchInput.value.trim();
            if (!query) return;

            // Redirect to search.html with query parameter
            window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}`;
        }
    });
});