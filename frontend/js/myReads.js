import { authenticatedFetch } from './session.js';

//Prevents HTML attacks
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

//Create a book card HTML
function createBookCard(book, currentStatus) {
    const cover = book.cover || "../images/bookCoverDefault.svg";
    const title = escapeHtml(book.title || "Unknown Title");
    const author = escapeHtml(book.author_name || "Unknown Author");
    const year = book.year_published ? `(${book.year_published})` : "";
    
    //Create status options excluding current status
    const statuses = ['Want to Read', 'Currently Reading', 'Finished'];
    const otherStatuses = statuses.filter(s => s !== currentStatus);
    
    return `
        <div class="book-card" data-book-id="${book.book_id}" data-current-status="${escapeHtml(currentStatus)}">
            <img src="${cover}" alt="${title}" class="book-cover">
            <div class="book-title">${title}</div>
            <div class="book-author">${author} ${year}</div>
            ${book.user_rating ? `<div class="litRating" style="font-size: 0.9rem; margin-top: 0.5rem;">Rating: ${'★'.repeat(book.user_rating)}${'☆'.repeat(5 - book.user_rating)}</div>` : ''}
            <div class="book-actions">
                <select class="status-dropdown" data-action="change-status">
                    <option value="" disabled selected>Move to...</option>
                    ${otherStatuses.map(status => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('')}
                </select>
                <button class="status-btn remove-btn" data-action="remove">Remove</button>
            </div>
        </div>
    `;
}

//Load and display books
async function loadMyBooks() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const booksContainer = document.getElementById('booksContainer');
    
    try {
        const response = await authenticatedFetch('/user_books/my_books');
        
        if (!response.ok) {
            throw new Error('Failed to fetch books');
        }
        
        const data = await response.json();
        
        //Hide loading and show content
        loadingIndicator.style.display = 'none';
        booksContainer.style.display = 'block';
        
        //Populate each section
        populateSection('currentlyReadingGrid', data.books['Currently Reading']);
        populateSection('wantToReadGrid', data.books['Want to Read']);
        populateSection('finishedGrid', data.books['Finished']);
        
    } catch (error) {
        console.error('Error loading books:', error);
        loadingIndicator.innerHTML = `
            <p style="color: #dc3545;">Error loading your books. Please try again later.</p>
            <button onclick="location.reload()" class="main-button-brown-small">Retry</button>
        `;
        
        if (error.message.includes("not authenticated")) {
            setTimeout(() => {
                window.location.href = '../loginPages/login.html';
            }, 2000);
        }
    }
}

//Populate a specific section with books
function populateSection(gridId, books, status) {
    const grid = document.getElementById(gridId);
    
    if (!books || books.length === 0) {
        //Keep empty state
        return;
    }
    
    //Clear empty state and add books
    grid.innerHTML = books.map(book => createBookCard(book, status)).join('');
}

//Handle book removal
async function removeBook(bookId, bookCard) {
    if (!confirm('Are you sure you want to remove this book from your reading list?')) {
        return;
    }
    
    try {
        const response = await authenticatedFetch(`/user_books/remove/${bookId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove book');
        }
        
        //Remove card with animation
        bookCard.style.opacity = '0';
        bookCard.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            const grid = bookCard.parentElement;
            bookCard.remove();
            
            //Check if grid now empty
            if (grid.children.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <img src="../images/bookCoverDefault.svg" alt="No books">
                        <p>No books in this section</p>
                    </div>
                `;
            }
        }, 300);
        
    } catch (error) {
        console.error('Error removing book:', error);
        alert('Failed to remove book. Please try again.');
    }
}

//Handle status change
async function changeBookStatus(bookId, newStatus, bookCard) {
    const oldStatus = bookCard.dataset.currentStatus;
    
    try {
        //Get book data to send in request
        const title = bookCard.querySelector('.book-title').textContent;
        const authorText = bookCard.querySelector('.book-author').textContent;
        const author = authorText.split('(')[0].trim();  //Remove year if present
        
        const response = await authenticatedFetch(`/user_books/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                author_name: author,
                isbn: null,  //Don't have this readily available
                status: newStatus
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update status');
        }
        
        //Animate card moving out
        bookCard.style.opacity = '0';
        bookCard.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            const oldGrid = bookCard.parentElement;
            bookCard.remove();
            
            //Check if old grid is now empty
            if (oldGrid.children.length === 0) {
                oldGrid.innerHTML = `
                    <div class="empty-state">
                        <img src="../images/bookCoverDefault.svg" alt="No books">
                        <p>No books in this section</p>
                    </div>
                `;
            }
            
            //Reload page to show book in new section
            loadMyBooks();
        }, 300);
        
    } catch (error) {
        console.error('Error changing book status:', error);
        alert('Failed to change status. Please try again.');
        //Reset dropdown
        const dropdown = bookCard.querySelector('.status-dropdown');
        if (dropdown) dropdown.value = '';
    }
}

//Event delegation for book actions
document.addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('[data-action="remove"]');
    
    if (removeBtn) {
        const bookCard = removeBtn.closest('.book-card');
        const bookId = bookCard.dataset.bookId;
        await removeBook(bookId, bookCard);
    }
});

//Event delegation for status dropdown changes
document.addEventListener('change', async (e) => {
    const dropdown = e.target.closest('[data-action="change-status"]');
    
    if (dropdown && dropdown.value) {
        const bookCard = dropdown.closest('.book-card');
        const bookId = bookCard.dataset.bookId;
        const newStatus = dropdown.value;
        
        await changeBookStatus(bookId, newStatus, bookCard);
    }
});

//Load books when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadMyBooks();
});