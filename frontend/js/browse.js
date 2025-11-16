import { authenticatedFetch } from '../js/session.js';

function starFillPercent(avg, max = 5) {
  if (!Number.isFinite(avg)) return "0%";
  const clamped = Math.max(0, Math.min(max, avg));
  return `${(clamped / max) * 100}%`;
}

// Prevents html attacks
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderReviewItem(r) {
    const rating = Number(r.rating ?? NaN);
    const text = r.text ?? "";
    const user = r.username ?? ""
    const created = r.created_at;

    const stars = Number.isFinite(rating)
        ? `<span class="stars" style="--percent:${starFillPercent(rating)}">★★★★★</span>`
    : `<span class="stars" style="--percent:0%">★★★★★</span>`;
    
    let createdStr = "";
    if (created) {
        const d = new Date(created);
        createdStr = isNaN(d) ? String(created) : d.toLocaleDateString();
    }
    return `
        <div class="reviewContainer">
            <h1 class="reviewRating">${stars}</h1>
            <p style="color: var(--darkBrown);">${escapeHtml(text)}</p>
            <a href="../userPages/profile.html?username=${user}">${escapeHtml(user)}</a>
            ${createdStr ? `<p class="mb-0">Created on: ${escapeHtml(createdStr)}</p>` : ""}
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("search");
    const pageCurrent = Number(urlParams.get("page") || 1);
    const searchInput = document.getElementById("searchInput");
    const resultsDiv = document.getElementById("results");
    let pageTotal = 0;
    let currentBooks = [];  //store book data for later use
    let userCollections = [];

    // keep search query active
    if (searchInput && query) { searchInput.value = query; }

    // grab url parameters
    const minRating = urlParams.get("minRating");
    const maxRating = urlParams.get("maxRating");
    const pubDateStart = urlParams.get("pubDateStart");
    const pubDateEnd = urlParams.get("pubDateEnd");

    // keep url parameters active after search
    if (minRating) {
        const minRadio = document.querySelector(`input[name="minRating"][value="${minRating}"]`); // grab star with url value
        if (minRadio) { minRadio.checked = true; }
    }
    if (maxRating) {
        const maxRadio = document.querySelector(`input[name="maxRating"][value="${maxRating}"]`); // grab star with url value
        if (maxRadio) { maxRadio.checked = true; }
    }
    if (pubDateStart) { document.getElementById("pubDateStart").value = pubDateStart; }
    if (pubDateEnd) { document.getElementById("pubDateEnd").value = pubDateEnd; }

    if (!query || !resultsDiv) return;

    try {
        const body = {
            search: query,
            limit: 50,
            ...(urlParams.has("minRating") ? { minRating: Number(urlParams.get("minRating")) } : {}),
            ...(urlParams.has("maxRating") ? { maxRating: Number(urlParams.get("maxRating")) } : {}),
            ...(urlParams.get("pubDateStart") ? { pubDateStart: urlParams.get("pubDateStart") } : {}),
            ...(urlParams.get("pubDateEnd") ? { pubDateEnd: urlParams.get("pubDateEnd") } : {}),
        };

        const response = await fetch("/book_router/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error("Network response not ok");

        const data = await response.json();

        const resultsCol = document.createElement("div");
        resultsCol.classList.add("resultsCol");

        if (data.results && data.results.length > 0) {
            currentBooks = data.results;  //store for later use

            const bookPerPage = 5;
            pageTotal = Math.ceil(data.results.length / bookPerPage);
            let pager = document.getElementById("pager");
            pager.innerHTML = `${pageCurrent} / ${pageTotal}`;

            let i = 0;
            data.results.forEach((book, index) => {
                i += 1;
                if (i > ((pageCurrent-1) * bookPerPage) && i <= (pageCurrent * bookPerPage)) {
                    const bookDiv = document.createElement("div");
                    bookDiv.classList.add("lit");
                    bookDiv.dataset.bookIndex = index;  //store index to retrieve book data later

                    const avg = Number(book.book_rating ?? NaN);
                    const count = Number(book.book_rating_count ?? 0);
                    const percent = starFillPercent(avg);

                    bookDiv.innerHTML = `
                        <div class="coverImgContainer">
                            <img src="${book.cover || "../images/bookCoverDefault.svg"}" class="coverImage">
                        </div>
                        <div class="litTitle">${book.title || 'No Title'}</div>
                        <div class="litAuthor">
                            By ${book.authors ? book.authors.join(", ") : 'Unknown'} 
                            <br> <em> ${book.first_publish_year || 'N/A'} </em> 
                        </div>
                        <div class="litRating">
                            ${Number.isFinite(avg) ? `<span class="stars" style="--percent:${percent}">★★★★★</span>` : ""}
                            ${count > 0 ? `<span class="reviewCount"> | <a href="#" class="viewReviewsPopup">View Reviews (${count})</a></span>` : ""}
                        </div>
                        <div class="iconsContainer">
                            <button class="unstyled-button openReadingListPopup">
                                <img class="icon" src="../images/addToList.svg" title="Add to Reading List">
                            </button>
                            <button class="unstyled-button openCollectionPopup">
                                <img class="icon" src="../images/addToCollection.svg" title="Add to Collection">
                            </button>
                            <button type="button" class="unstyled-button openReviewPopup">
                                <img class="icon" src="../images/review.svg" title="Leave a Review">
                            </button>
                        </div>
                    `;
                    resultsCol.appendChild(bookDiv);
                }
            });
        } else {
            resultsCol.innerHTML = "<p>No results found.</p>";
        }

        resultsDiv.appendChild(resultsCol);
    } catch (error) {
        console.error("Search failed:", error);
        resultsDiv.innerHTML = "<p>An error occurred while searching.</p>";
    }

    //store current book data globally for popup handlers
    let currentBookData = null;

    //event delegation
    document.addEventListener("click", async (e) => {
        //grab elements
        const popup = document.getElementById("popup");
        const popupBackdrop = document.getElementById("popupBackdrop"); 
        const popupContentReview = popup?.querySelector(".popupContentReview#makeReview"); 
        const popupContentReadingList = popup?.querySelector("#addToReadingList");
        const popupContentCollection = popup?.querySelector(".popupContentCollection"); 
        const popupContentViewReviews = popup?.querySelector(".popupContentViewReviews");

        if (e.target.closest(".openReadingListPopup") || e.target.closest(".openReviewPopup") || e.target.closest(".openCollectionPopup") || e.target.closest(".viewReviewsPopup")) {
            const litDiv = e.target.closest(".lit");
            const bookIndex = litDiv.dataset.bookIndex;
            currentBookData = currentBooks[bookIndex];
            
            //dynamic titles
            const titleText = litDiv.querySelector(".litTitle").textContent.trim();
            const reviewTitle = document.getElementById("reviewTitle");
            const readingListTitle = document.getElementById("readingListTitle");
            const collectionTitle = document.getElementById("collectionTitle");
            const litTitle = document.getElementById("litTitle");

            //make needed elements visible
            if (popup) popup.style.display = "grid";
            if (popupBackdrop) popupBackdrop.style.display = "block";
            
            if (e.target.closest(".openReadingListPopup") && popupContentReadingList) { 
                popupContentReadingList.style.display = "flex"; 
                if (readingListTitle) readingListTitle.innerHTML = `Add "${titleText}" to Reading List`;
            }
            
            if (e.target.closest(".openReviewPopup") && popupContentReview) { 
                popupContentReview.style.display = "flex"; 
                if (reviewTitle) reviewTitle.innerHTML = `Review "${titleText}"`;
            }
            if (e.target.closest(".openCollectionPopup") && popupContentCollection) { 
                popupContentCollection.style.display = "flex"; 
                if (collectionTitle) collectionTitle.innerHTML = `Add "${titleText}" to Collections`;

                //Fetch collections dynamically
                try {
                    const res = await authenticatedFetch('/collections/get_collections');
                    if (!res.ok) throw new Error("Failed to fetch collections");
                    const data = await res.json();
                    userCollections = data.collections || [];

                    const fieldset = popupContentCollection.querySelector("fieldset");
                    fieldset.innerHTML = "";  //clear placeholders

                    if (userCollections.length === 0) {
                        fieldset.innerHTML = `<p class="muted">You have no collections yet.</p>`;
                    } else {
                        userCollections.forEach(c => {
                            fieldset.insertAdjacentHTML("beforeend", `
                                <div class="collectionContainer">
                                    <input type="checkbox" class="collectionSelection m-3" value="${c.collectionId}">
                                    <img src="../images/collections/${c.iconId || "default"}.svg" class="collectionImg">
                                    <p class="collectionTitle">${escapeHtml(c.name)}</p>
                                </div>
                            `);
                        });
                    }
                } catch (err) {
                    console.error("Error loading collections:", err);
                    const fieldset = popupContentCollection.querySelector("fieldset");
                    fieldset.innerHTML = `<p class="muted">Error loading collections.</p>`;
                }
            }
            if (e.target.closest(".viewReviewsPopup") && popupContentViewReviews) { 
                popupContentViewReviews.style.display = "flex"; 
                if (litTitle) litTitle.innerHTML = `Reviews for "${titleText}"`;
                
                // Remove any previous
                popupContentViewReviews
                    .querySelectorAll(".reviewContainer")
                    .forEach(el => el.remove());

                const reviews = Array.isArray(currentBookData?.book_reviews)
                    ? currentBookData.book_reviews
                    : [];
                
                if (reviews.length === 0) { // Add default if reviews is empty
                    popupContentViewReviews.insertAdjacentHTML(
                    "beforeend",
                    `<p class="muted reviewContainer">No reviews yet.</p>`
                    );
                } else { // Populate reviews
                    const html = reviews.map(renderReviewItem).join("");
                    popupContentViewReviews.insertAdjacentHTML("beforeend", html);
                }
            }
        }
        
        if (e.target.closest(".close")) {  //make popups invisible
            if (popup) popup.style.display = "none";
            if (popupBackdrop) popupBackdrop.style.display = "none";
            if (popupContentReview) popupContentReview.style.display = "none";
            if (popupContentReadingList) popupContentReadingList.style.display = "none";
            if (popupContentCollection) popupContentCollection.style.display = "none";
            if (popupContentViewReviews) popupContentViewReviews.style.display = "none";
        }
    });

    // Handle reading status selection
    document.addEventListener("click", async (e) => {
        const statusBtn = e.target.closest(".status-choice");
        if (!statusBtn) return;
        
        e.preventDefault();
        
        if (!currentBookData) {
            alert("Error: No book selected");
            return;
        }

        const status = statusBtn.dataset.status;
        
        const bookData = {
            title: currentBookData.title,
            author_name: currentBookData.authors?.[0] || null,
            isbn: currentBookData.isbn,
            first_publish_year: currentBookData.first_publish_year,
            cover: currentBookData.cover,
            status: status
        };

        try {
            const response = await authenticatedFetch('/user_books/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to add to reading list');
            }

            const result = await response.json();
            alert(result.message || `Book added to "${status}"!`);
            
            //close popup
            const popup = document.getElementById("popup");
            const popupBackdrop = document.getElementById("popupBackdrop");
            const popupContentReadingList = popup?.querySelector("#addToReadingList");
            
            if (popup) popup.style.display = "none";
            if (popupBackdrop) popupBackdrop.style.display = "none";
            if (popupContentReadingList) popupContentReadingList.style.display = "none";
            
        } catch (error) {
            console.error('Error adding to reading list:', error);
            if (error.message.includes("not authenticated")) {
                alert('Please log in to add books to your reading list');
                window.location.href = '../loginPages/login.html';
            } else {
                alert('Error adding to reading list: ' + error.message);
            }
        }
    });

    //handle review submission
    const submitReviewBtn = document.getElementById("submitReview");
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            
            if (!currentBookData) {
                alert("Error: No book selected");
                return;
            }

            //get form values
            const ratingInput = document.querySelector('input[name="givenRating"]:checked');
            const reviewText = document.getElementById("reviewText").value;
            
            if (!ratingInput) {
                alert("Please select a rating");
                return;
            }

            const reviewData = {
                title: currentBookData.title,
                author_name: currentBookData.authors?.[0] || null,
                isbn: currentBookData.isbn,
                first_publish_year: currentBookData.first_publish_year,
                cover: currentBookData.cover,
                rating: parseInt(ratingInput.value),
                text: reviewText || null
            };

            try {
                const response = await authenticatedFetch('/reviews/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(reviewData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to submit review');
                }

                const result = await response.json();
                alert('Review submitted successfully!');
                
                //close popup and reset form
                const popup = document.getElementById("popup");
                const popupBackdrop = document.getElementById("popupBackdrop");
                const popupContentReview = popup?.querySelector(".popupContentReview");
                
                if (popup) popup.style.display = "none";
                if (popupBackdrop) popupBackdrop.style.display = "none";
                if (popupContentReview) popupContentReview.style.display = "none";
                
                const checkedRating = document.querySelector('input[name="givenRating"]:checked');
                if (checkedRating) checkedRating.checked = false;
                document.getElementById("reviewText").value = '';
                
            } catch (error) {
                console.error('Error submitting review:', error);
                if (error.message.includes("not authenticated")) {
                    alert('Please log in to submit a review');
                    window.location.href = '../loginPages/login.html';
                } else {
                    alert('Error submitting review: ' + error.message);
                }
            }
        });
    }

    //handle collection submission
    const submitCollectionBtn = document.getElementById("submitCollectionChoice");
    if (submitCollectionBtn) {
        submitCollectionBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            
            if (!currentBookData) {
                alert("Error: No book selected");
                return;
            }

            const selectedCollections = Array.from(
                document.querySelectorAll('.collectionSelection:checked')
            ).map(el => el.value);

            if (selectedCollections.length === 0) {
                alert("Please select at least one collection");
                return;
            }

            const bookData = {
                title: currentBookData.title,
                author_name: currentBookData.authors?.[0] || null,
                isbn: currentBookData.isbn,
                first_publish_year: currentBookData.first_publish_year,
                cover: currentBookData.cover,
                collection_ids: selectedCollections
            };

            try {
                const response = await authenticatedFetch('/collections/add_book', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bookData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to add to collection');
                }

                alert('Book added to selected collections!');
            
                //close popup
                const popup = document.getElementById("popup");
                const popupBackdrop = document.getElementById("popupBackdrop");
                const popupContentCollection = popup?.querySelector(".popupContentCollection");
            
                if (popup) popup.style.display = "none";
                if (popupBackdrop) popupBackdrop.style.display = "none";
                if (popupContentCollection) popupContentCollection.style.display = "none";
            } catch (error) {
                console.error('Error adding to collection:', error);
                if (error.message.includes("not authenticated")) {
                    alert('Please log in to add books to your collection');
                    window.location.href = '../loginPages/login.html';
                } else {
                    alert('Error adding to collection: ' + error.message);
                }
            }
        });
    }

    // constructs the query string for a given page
    function buildQueryString(page) {
        // empty params
        const params = new URLSearchParams();

        // set the parameters
        params.set("search", query);
        params.set("page", page);
        if (minRating) params.set("minRating", minRating);
        if (maxRating) params.set("maxRating", maxRating);
        if (pubDateStart) params.set("pubDateStart", pubDateStart);
        if (pubDateEnd) params.set("pubDateEnd", pubDateEnd);

        return params.toString(); // convert to string
    }

    // query string for going back a page
    const back = document.getElementById("backPage");
    if (back) {
        back.addEventListener("click", (event) => {
            if (pageCurrent >= 2) {
                window.location.href = `/subpages/browse.html?${buildQueryString(pageCurrent - 1)}`;
            } else {
                window.location.href = `/subpages/browse.html?${buildQueryString(pageCurrent)}`;
            }
        });
    }

    // query string for going forward a page
    const next = document.getElementById("nextPage");
    if (next) {
        next.addEventListener("click", (event) => {
            if (pageCurrent < pageTotal) {
                window.location.href = `/subpages/browse.html?${buildQueryString(pageCurrent + 1)}`;
            } else {
                window.location.href = `/subpages/browse.html?${buildQueryString(pageCurrent)}`;
            }
        });
    }
});