// ---------- tiny helpers ----------
const $ = (sel) => document.querySelector(sel);

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

let messageTimer;
function showMessage(text, isError = false) {
  const box = $('#message');
  box.textContent = text;
  box.className = 'message' + (isError ? ' error' : '');
  box.hidden = false;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => (box.hidden = true), 6000);
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

// Builds a table body using textContent, so database text can never inject HTML.
function fillTable(tbody, rows, columns, emptyText) {
  tbody.replaceChildren();
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = columns;
    td.className = 'empty';
    td.textContent = emptyText;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  rows.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((cell) => {
      const td = document.createElement('td');
      if (cell instanceof Node) td.appendChild(cell);
      else td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function badge(text, kind) {
  const span = document.createElement('span');
  span.className = 'badge ' + kind;
  span.textContent = text;
  return span;
}

// Switch-case in the front-end: map a status to a badge colour.
function statusBadge(status) {
  switch (status) {
    case 'ACTIVE':
      return badge('Active', 'warn');
    case 'RETURNED':
      return badge('Returned', 'ok');
    case 'CANCELLED':
      return badge('Cancelled', 'bad');
    default:
      return badge(status, 'warn');
  }
}

function eventLabel(action) {
  switch (action) {
    case 'RESERVED':
      return badge('Reserved', 'warn');
    case 'RETURNED':
      return badge('Returned', 'ok');
    case 'CANCELLED':
      return badge('Cancelled', 'bad');
    default:
      return badge(action, 'warn');
  }
}

// ---------- loading data ----------
function fillSelect(select, items, valueKey, labelFn) {
  const previous = select.value;
  select.replaceChildren();
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = labelFn(item);
    select.appendChild(option);
  });
  if (previous) select.value = previous;
}

async function loadUsers() {
  const users = await api('/api/users');
  fillSelect($('#userSelect'), users, 'user_id', (u) => `${u.name} (#${u.user_id})`);
  fillTable(
    $('#usersBody'),
    users.map((u) => [u.user_id, u.name, u.email]),
    3,
    'No members yet. Add one using the form.'
  );
}

async function loadBooks() {
  const books = await api('/api/books');
  fillSelect($('#bookSelect'), books, 'book_id', (b) =>
    `${b.title} (#${b.book_id})${b.available ? '' : ' - checked out'}`
  );
  fillTable(
    $('#booksBody'),
    books.map((b) => [
      b.book_id,
      b.title,
      b.author,
      b.available ? badge('Available', 'ok') : badge('Reserved', 'warn')
    ]),
    4,
    'No books yet. Add one using the form.'
  );
}

async function loadReservations() {
  const rows = await api('/api/reservations');
  fillTable(
    $('#reservationsBody'),
    rows.map((r) => [r.res_id, r.member, r.book, formatDate(r.res_date), statusBadge(r.status)]),
    5,
    'No reservations yet. Use the Circulation form to reserve a book.'
  );
}

async function loadHistory() {
  const rows = await api('/api/reservations/history');
  fillTable(
    $('#historyBody'),
    rows.map((h) => [h.history_id, h.res_id, h.member, h.book, eventLabel(h.action), formatDate(h.action_time)]),
    6,
    'Nothing logged yet. The triggers add a row for every reservation change.'
  );
}

async function refreshAll() {
  try {
    await Promise.all([loadUsers(), loadBooks(), loadReservations(), loadHistory()]);
  } catch (err) {
    showMessage('Could not load data: ' + err.message, true);
  }
}

// ---------- forms ----------
$('#circulationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const result = await api('/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        action: form.get('action'),
        user_id: form.get('user_id'),
        book_id: form.get('book_id')
      })
    });
    showMessage(result.message);
    await refreshAll();
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('#userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const result = await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: form.get('name'), email: form.get('email') })
    });
    showMessage(result.message);
    e.target.reset();
    await refreshAll();
  } catch (err) {
    showMessage(err.message, true);
  }
});

$('#bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const result = await api('/api/books', {
      method: 'POST',
      body: JSON.stringify({ title: form.get('title'), author: form.get('author') })
    });
    showMessage(result.message);
    e.target.reset();
    await refreshAll();
  } catch (err) {
    showMessage(err.message, true);
  }
});

// ---------- tabs ----------
document.querySelectorAll('.tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', 'false'));
    document.querySelectorAll('.tabpanel').forEach((p) => (p.hidden = true));
    button.setAttribute('aria-selected', 'true');
    $('#tab-' + button.dataset.tab).hidden = false;
  });
});

refreshAll();
