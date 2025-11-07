document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;

    const form = searchInput.closest("form");

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        const minRating = Number(document.querySelector('input[name="minRating"]:checked')?.value ?? null) || undefined;
        const maxRating = Number(document.querySelector('input[name="maxRating"]:checked')?.value ?? null) || undefined;
        const pubDateStart = document.getElementById("pubDateStart")?.value || null;
        const pubDateEnd   = document.getElementById("pubDateEnd")?.value   || null;

        const params = new URLSearchParams();
        params.set("search", query);
        params.set("page", 1);
        params.set("minRating", minRating)
        params.set("maxRating", maxRating)
        params.set("pubDateStart", pubDateStart)
        params.set("pubDateEnd", pubDateEnd)

        // Redirect to search.html with parameters
        window.location.href = `/subpages/browse.html?${params.toString()}`;
    });
});