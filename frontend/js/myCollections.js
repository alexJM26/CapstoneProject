import { authenticatedFetch } from '../js/session.js';

function initCollectionsUI(){

  const dd = document.getElementById('collectionsDropdown');
  const tbody = document.getElementById('collectionsTableBody');
  if (!dd || !tbody) {alert(`DD or TBODY doesnt exist`); return;}

  let collections = [];

  function renderDropdown(items) {
    dd.innerHTML = '';
    if (!items.length) {
      const opt = document.createElement('option');
      opt.textContent = 'No collections yet';
      opt.value = '';
      dd.appendChild(opt);
      return;
    }
    items.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.collectionId;
      opt.textContent = c.name;
      dd.appendChild(opt);
    });
  }

  async function renderBooksFor(collectionId) {
    tbody.innerHTML = '';

    if (!collectionId) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4">No collection selected.</td>`;
      tbody.appendChild(tr);
      return;
    }

    try {
      const res = await authenticatedFetch(`/collections/get_collection_books/${collectionId}`);
      if (!res.ok) throw new Error("Failed to fetch books");
      const data = await res.json();
      const books = Array.isArray(data.books) ? data.books : [];

      if (!books.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5">No books in this collection yet.</td>`;
        tbody.appendChild(tr);
        return;
      }

      //Sort by position before rendering
      books.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      books.forEach((b, i) => {
        const tr = document.createElement('tr');

        //Cover image cell
        const coverUrl = b.cover_img_url || '../images/bookCoverDefault.svg';
        tr.innerHTML = `
          <td><img src="${coverUrl}" alt="Cover" style="height:80px; border-radius:6px;"></td>
          <td>${b.title || '(Untitled)'}</td>
          <td>${b.author_name || 'Unknown Author'}</td>
          <td>${b.year_published || ''}</td>
          <td>
            <button class="btn btn-light btn-sm move-up" data-book-id="${b.book_id}" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn btn-light btn-sm move-down" data-book-id="${b.book_id}" ${i === books.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="remove-btn btn btn-sm btn-outline-danger" data-book-id="${b.book_id}">Remove</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error loading books for collection:", err);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5">Error loading books.</td>`;
      tbody.appendChild(tr);
    }
  }

  //Handle remove clicks
  tbody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-btn')) {
      const bookId = e.target.dataset.bookId;
      const currentCollectionId = dd.value;
      if (!confirm('Remove this book from the collection?')) return;
      try {
        const res = await authenticatedFetch(`/collections/remove_book/${currentCollectionId}/${bookId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to remove');
        //refresh list
        await renderBooksFor(currentCollectionId);
      } catch (err) {
        alert('Error removing book: ' + err.message);
      }
    }
  });

  tbody.addEventListener('click', async (e) => {
    const btn = e.target;
    const collectionId = dd.value;

    //Move Up
    if (btn.classList.contains('move-up') || btn.classList.contains('move-down')) {
      const bookId = parseInt(btn.dataset.bookId);
      const isUp = btn.classList.contains('move-up');

      //Find current order from rows
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const currentIndex = rows.findIndex(r => r.querySelector(`[data-book-id="${bookId}"]`));

      //Calculate swap target
      const swapIndex = isUp ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= rows.length) return;

      const swapBookId = parseInt(rows[swapIndex].querySelector('.move-up').dataset.bookId);

      try {
        //Send updated positions to backend
        await authenticatedFetch(`/collections/update_position/${collectionId}/${bookId}?new_position=${swapIndex + 1}`, { method: 'PATCH' });
        await authenticatedFetch(`/collections/update_position/${collectionId}/${swapBookId}?new_position=${currentIndex + 1}`, { method: 'PATCH' });
      
        //Re-render table
        await renderBooksFor(collectionId);
      } catch (err) {
        console.error(err);
        alert('Error reordering books');
      }
    }
  });

  async function loadUserCollections() {
    try {
      const res = await authenticatedFetch('/collections/get_collections');
      const data = await res.json();
      collections = Array.isArray(data?.collections) ? data.collections : [];

      renderDropdown(collections);
      if (collections.length) {
        await renderBooksFor(collections[0].collectionId);
        dd.value = collections[0].collectionId;
      } else {
        renderBooksFor('');
      }
    } catch (err) {
      console.error(err);
      collections = [];
      renderDropdown(collections);
      renderBooksFor('');
    }
  }

  dd.addEventListener('change', (e) => renderBooksFor(e.target.value));
  loadUserCollections();
}


document.addEventListener('DOMContentLoaded', initCollectionsUI, {once: true});