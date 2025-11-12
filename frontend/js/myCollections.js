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
      const td = document.createElement('td');
      td.textContent = 'No collection selected.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    try {
      const res = await authenticatedFetch(`/collections/get_collection_books/${collectionId}`);
      if (!res.ok) throw new Error("Failed to fetch books");
      const data = await res.json();
      const books = Array.isArray(data.books) ? data.books : [];

      if (books.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.textContent = 'No books in this collection yet.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      books.forEach(b => {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.textContent = b.title || '(Untitled)';
        tr.appendChild(td);
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error loading books for collection:", err);
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = 'Error loading books.';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

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