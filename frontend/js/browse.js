import { authenticatedFetch } from '../js/session.js';

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("search");
    const pageCurrent = Number(urlParams.get("page"));
    const searchInput = document.getElementById("searchInput");
    const resultsDiv = document.getElementById("results");
    let pageTotal = 0;
    let currentBooks = [];  //store book data for later use

    if (searchInput && query) {
        searchInput.value = query;
    }

    if (!query || !resultsDiv) return;

    try {
        const response = await fetch(`/book_router/search?q=${encodeURIComponent(query)}&limit=50&page=1`);
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

                    bookDiv.innerHTML = `
                        <div class="coverImgContainer">
                            <img src="${book.cover || "../images/bookCoverDefault.svg"}" class="coverImage">
                        </div>
                        <div class="litTitle">${book.title || 'No Title'}</div>
                        <div class="litAuthor">By ${book.authors ? book.authors.join(", ") : 'Unknown'}</div>
                        <div class="litRating">
                            &#9733; &#9733; &#9733; &#9733; &#9733; | <a href="#">View Reviews (10)</a>
                        </div>
                        <div class="iconsContainer">
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
    document.addEventListener("click", e => {
        if (e.target.closest(".openReviewPopup")) {
            const litDiv = e.target.closest(".lit");
            const bookIndex = litDiv.dataset.bookIndex;
            currentBookData = currentBooks[bookIndex];
            
            const titleText = litDiv.querySelector(".litTitle").textContent.trim();
            const title = document.getElementById("reviewTitle");
            title.innerHTML = `Review "${titleText}"`;

            popupReview.style.display = "grid";
            popupBackdrop.style.display = "block";
        }
        if (e.target.closest(".openCollectionPopup")) {
            const litDiv = e.target.closest(".lit");
            const bookIndex = litDiv.dataset.bookIndex;
            currentBookData = currentBooks[bookIndex];
            
            const titleText = litDiv.querySelector(".litTitle").textContent.trim();
            const title = document.getElementById("collectionTitle");
            title.innerHTML = `Add "${titleText}" to Collection`;

            popupCollection.style.display = "grid";
            popupBackdrop.style.display = "block";
        }
        if (e.target.closest(".closeReview") || e.target.closest(".closeCollection")) {
            popupReview.style.display = "none";
            popupCollection.style.display = "none";
            popupBackdrop.style.display = "none";
        }
    });

    //handle review submission
    const submitReviewBtn = document.getElementById("submitReview");
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
            popupReview.style.display = "none";
            popupBackdrop.style.display = "none";
            document.querySelector('input[name="givenRating"]:checked').checked = false;
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

    //handle collection submission
    const submitCollectionBtn = document.getElementById("submitCollectionChoice");
    submitCollectionBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        
        if (!currentBookData) {
            alert("Error: No book selected");
            return;
        }

        //for now just adding to "Want to Read" status
        //can expand  to actually use collection checkboxes later
        const bookData = {
            title: currentBookData.title,
            author_name: currentBookData.authors?.[0] || null,
            isbn: currentBookData.isbn,
            first_publish_year: currentBookData.first_publish_year,
            cover: currentBookData.cover,
            status: "Want to Read"  //default status
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
                throw new Error(error.detail || 'Failed to add to collection');
            }

            const result = await response.json();
            alert('Book added to your collection!');
            
            //close popup
            popupCollection.style.display = "none";
            popupBackdrop.style.display = "none";
            
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

    const back = document.getElementById("backPage");
    back.addEventListener("click", (event) => {
        if (pageCurrent >= 2) {
            window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}&page=${pageCurrent - 1}`;
        } else {
            window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}&page=${pageCurrent}`;
        }
    });

    const next = document.getElementById("nextPage");
    next.addEventListener("click", (event) => {
        if (pageCurrent < pageTotal) {
            window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}&page=${pageCurrent + 1}`;
        } else {
            window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}&page=${pageCurrent}`;
        }
    });
});