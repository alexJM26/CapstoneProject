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

  function renderBooksFor(collectionId) {
    tbody.innerHTML = '';
    const coll = collections.find(c => String(c.collectionId) === String(collectionId));
    const books = coll?.books || [];
    if (!books.length) {
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
  }

  async function loadUserCollections() {
    try {
      const res = await authenticatedFetch('/collections/get_collections');
      const data = await res.json();
      collections = Array.isArray(data?.collections) ? data.collections : [];


      renderDropdown(collections);
      // Render first collection’s books immediately
      if (collections.length) renderBooksFor(collections[0].collectionId);
      else renderBooksFor('');
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