import { authenticatedFetch } from '../js/session.js';

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("search");
    const pageCurrent = Number(urlParams.get("page") || 1);
    const searchInput = document.getElementById("searchInput");
    const resultsDiv = document.getElementById("results");
    let pageTotal = 0;
    let currentBooks = [];  //store book data for later use

    if (searchInput && query) {
        searchInput.value = query;
    }

    if (!query || !resultsDiv) return;

    try {
        const body = {
            search: query,
            limit: 20,
            page: pageCurrent,
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
                            &#9733; &#9733; &#9733; &#9733; &#9733; | <a href="#" class="viewReviewsPopup">View Reviews (10)</a>
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
        //grab elements
        const popup = document.getElementById("popup");
        const popupBackdrop = document.getElementById("popupBackdrop"); 
        const popupContentReview = popup?.querySelector(".popupContentReview"); 
        const popupContentCollection = popup?.querySelector(".popupContentCollection"); 
        const popupContentViewReviews = popup?.querySelector(".popupContentViewReviews");

        if (e.target.closest(".openReviewPopup") || e.target.closest(".openCollectionPopup") || e.target.closest(".viewReviewsPopup")) {
            const litDiv = e.target.closest(".lit");
            const bookIndex = litDiv.dataset.bookIndex;
            currentBookData = currentBooks[bookIndex];
            
            //dynamic titles
            const titleText = litDiv.querySelector(".litTitle").textContent.trim();
            const reviewTitle = document.getElementById("reviewTitle");
            const collectionTitle = document.getElementById("collectionTitle");
            const litTitle = document.getElementById("litTitle");

            //make needed elements visible
            if (popup) popup.style.display = "grid";
            if (popupBackdrop) popupBackdrop.style.display = "block";
            
            if (e.target.closest(".openReviewPopup") && popupContentReview) { 
                popupContentReview.style.display = "flex"; 
                if (reviewTitle) reviewTitle.innerHTML = `Review "${titleText}"`;
            }
            if (e.target.closest(".openCollectionPopup") && popupContentCollection) { 
                popupContentCollection.style.display = "flex"; 
                if (collectionTitle) collectionTitle.innerHTML = `Add "${titleText}" to Collections`;
            }
            if (e.target.closest(".viewReviewsPopup") && popupContentViewReviews) { 
                popupContentViewReviews.style.display = "flex"; 
                if (litTitle) litTitle.innerHTML = `Reviews for "${titleText}"`;
            }
        }
        
        if (e.target.closest(".close")) {  //make popups invisible
            if (popup) popup.style.display = "none";
            if (popupBackdrop) popupBackdrop.style.display = "none";
            if (popupContentReview) popupContentReview.style.display = "none";
            if (popupContentCollection) popupContentCollection.style.display = "none";
            if (popupContentViewReviews) popupContentViewReviews.style.display = "none";
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

            //for now just adding to "Want to Read" status
            //can expand to actually use collection checkboxes later
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

    const back = document.getElementById("backPage");
    if (back) {
        back.addEventListener("click", (event) => {
            if (pageCurrent >= 2) {
                window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}&page=${pageCurrent - 1}`;
            } else {
                window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}&page=${pageCurrent}`;
            }
        });
    }

    const next = document.getElementById("nextPage");
    if (next) {
        next.addEventListener("click", (event) => {
            if (pageCurrent < pageTotal) {
                window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}&page=${pageCurrent + 1}`;
            } else {
                window.location.href = `/subpages/browse.html?search=${encodeURIComponent(query)}&page=${pageCurrent}`;
            }
        });
    }
});