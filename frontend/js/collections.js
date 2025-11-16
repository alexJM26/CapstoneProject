
// Prevents html attacks
function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}



document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".filter form");
    const searchInput = document.getElementById("collectionSearchInput");
    const pubDateStartInput = document.getElementById("pubDateStart");
    const pubDateEndInput = document.getElementById("pubDateEnd");

    // Popup values
    const popup = document.getElementById("popup");
    const popupBackdrop = document.getElementById("popupBackdrop");
    const popupContentCollection = document.getElementById("viewCollection");
    const popupTitle = popupContentCollection?.querySelector("#reviewTitle");

    let currentCollections = [];

    // Will take values from URL and fill in the inputs
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get("search") || "";
    const initialStart = urlParams.get("pubDateStart") || "";
    const initialEnd = urlParams.get("pubDateEnd") || "";

    if (searchInput) searchInput.value = initialSearch;
    if (pubDateStartInput) pubDateStartInput.value = initialStart;
    if (pubDateEndInput) pubDateEndInput.value = initialEnd;

    // Use URl and call the search function
    if (initialSearch || initialStart || initialEnd) {
        searchCollections({
            search: initialSearch,
            pubDateStart: initialStart,
            pubDateEnd: initialEnd
        });
    }


    // Connect submit button to search collections function above
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const search = searchInput.value;
            const pubDateStart = pubDateStartInput.value;
            const pubDateEnd = pubDateEndInput.value;

            // Update the url
            const params = new URLSearchParams(window.location.search);
            if (search) params.set("search", search); else params.delete("search");
            if (pubDateStart) params.set("pubDateStart", pubDateStart); else params.delete("pubDateStart");
            if (pubDateEnd) params.set("pubDateEnd", pubDateEnd); else params.delete("pubDateEnd");

            const newUrl = window.location.pathname + "?" + params.toString();
            window.history.replaceState({}, "", newUrl);

            searchCollections({ search, pubDateStart, pubDateEnd });
        });
    }

    // This will get search, start/end times and send it to the server, then format the results.
    async function searchCollections({ search, pubDateStart, pubDateEnd }) {
        const resultsDiv = document.getElementById("results");

        // Remove previous search results
        resultsDiv.querySelectorAll(".resultsCol").forEach(el=>el.remove());
        

        // search collection request
        const body = {
            ...(search ? { search } : {}),
            ...(pubDateStart ? { pubDateStart } : {}),
            ...(pubDateEnd ? { pubDateEnd } : {})
        };

        try {
            const response = await fetch("/collections/search_collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error("Network response not ok");

            const data = await response.json();
            currentCollections = data.results || [];

            const resultsCol = document.createElement("div");
            resultsCol.classList.add("resultsCol");

            if (currentCollections.length === 0) {
                resultsCol.innerHTML = "<p>No collections found.</p>";
            } else {
                currentCollections.forEach((collection, index) => {
                    const colDiv = document.createElement("div");
                    colDiv.classList.add("collection");
                    colDiv.dataset.collectionIndex = index;

                    const iconId = collection.iconId || "1"; // Default icon is 1 if it doesnt have one
                    const title = collection.title || collection.name || "Untitled Collection";
                    const username = collection.username || collection.createdBy || "Unknown";
                    const createdAt =
                        collection.created_at ||
                        collection.createdAt ||
                        collection.creationDate ||
                        "";

                    // HTML of book listings
                    colDiv.innerHTML = `
                        <div class="coverImgContainer">
                            <img src="../images/collections/${iconId}.svg" class="coverImage">
                        </div>
                        <div class="litTitle">${escapeHtml(title)}</div>
                        <div class="litAuthor">
                            Created By <a href="#">${escapeHtml(username)}</a>
                        </div>
                        <div class="litRating">
                            <em>${escapeHtml(createdAt)}</em>
                        </div>
                        <div class="iconsContainer">
                            <button class="unstyled-button viewCollectionPopup">
                                <img class="icon" src="../images/viewCollection.svg" title="View Collection">
                            </button>
                        </div>
                    `;

                    resultsCol.appendChild(colDiv);
                });
            }

            resultsDiv.appendChild(resultsCol);
        } catch (err) { // Output error for when the search fails
            console.error("Collection search failed:", err);
            const errorCol = document.createElement("div");
            errorCol.classList.add("resultsCol");
            errorCol.innerHTML = "<p>An error occurred while searching.</p>";
            resultsDiv.appendChild(errorCol);
        }
    }

    // Popup when clicking on a collection
    document.addEventListener("click", (e) => {
        const viewBtn = e.target.closest(".viewCollectionPopup");
        const closeBtn = e.target.closest(".close");

        if (viewBtn) {
            const colDiv = viewBtn.closest(".collection");
            const index = colDiv?.dataset.collectionIndex;
            if (index == null) return;

            const collection = currentCollections[index];
            if (!collection || !popup || !popupBackdrop || !popupContentCollection) return;

            // Show popup
            popup.style.display = "grid";
            popupBackdrop.style.display = "block";

            const title = collection.title || collection.name || "This Collection";
            if (popupTitle) {
                popupTitle.textContent = `View the Books of ${title}`;
            }

            // Clear previous
            popupContentCollection
                .querySelectorAll(".innerCollectionLit, .muted")
                .forEach(el => el.remove());

            const books = Array.isArray(collection.books) ? collection.books : [];

            if (books.length === 0) { // If there are no books then give them a result
                popupContentCollection.insertAdjacentHTML(
                    "beforeend",
                    `<p class="muted">No books in this collection yet.</p>`
                );
            } else { // Thereare books so show them
                books.forEach((book) => {
                    const bookTitle = book.title || "Title";
                    const cover = book.cover || "../images/bookCoverDefault.svg";
                    const encodedSearch = encodeURIComponent(bookTitle);

                    const inner = document.createElement("div");
                    inner.classList.add("innerCollectionLit");

                    // HTML per book in popup
                    inner.innerHTML = `
                        <img src="${cover}" class="innerCollectionLitImg">
                        <div class="litTitle">${escapeHtml(bookTitle)}</div>
                        <div class="iconsContainer">
                            <a href="browse.html?search=${encodedSearch}&page=1" class="unstyled-button">
                                <img class="icon" src="../images/search.svg" title="Search for Book">
                            </a>
                        </div>
                    `;

                    popupContentCollection.appendChild(inner);
                });
            }
        }

        // Close popup
        if (closeBtn) {
            if (popup) popup.style.display = "none";
            if (popupBackdrop) popupBackdrop.style.display = "none";
        }
    });
});
