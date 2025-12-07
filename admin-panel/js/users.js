// admin-panel/js/users.js
import { getAuthHeaders, requireAdminAuth } from './auth.js';

// Gate the page (redirects to login if no token/admin role)
requireAdminAuth();

// ---- API base (always hit the backend port 5000) ----
const ADMIN_API = 'http://localhost:5000/api/admin';

// ---- DOM refs ----
const tableBody     = document.getElementById('userTableBody');
const searchInput   = document.getElementById('userSearchInput');
const modal         = document.getElementById('userModal');
const closeModalBtn = document.getElementById('closeUserModal');
const modalDetails  = document.getElementById('modalUserDetails');

// If any of these are missing, bail early to avoid TypeErrors in dev
if (!tableBody || !searchInput) {
  console.warn('users.js: expected table/search elements not found on this page.');
}

// We’ll read the token the same way auth.js builds headers
function getToken() {
  const h = getAuthHeaders();
  // h.Authorization = "Bearer <token>"
  return h.Authorization?.split(' ')[1] || null;
}

let userData = [];

// ---------- Render table ----------
function renderTable(users) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  users.forEach((user) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.fullName ?? ''}</td>
      <td>${user.username ?? ''}</td>
      <td>${user.email ?? ''}</td>
      <td>${user.role ?? ''}</td>
      <td class="status-cell">${user.status ?? ''}</td>
      <td>${user.createdAt ?? ''}</td>
      <td>
        <button class="action-btn view">View</button>
        ${user.role === 'admin' ? '' : `<button class="action-btn suspend">Suspend</button>`}
        ${user.role === 'admin' ? '' : `<button class="action-btn promote">Promote</button>`}
      </td>
    `;
    tableBody.appendChild(row);

    // ----- Suspend -----
    const suspendBtn = row.querySelector('.suspend');
    if (suspendBtn) {
      suspendBtn.addEventListener('click', async () => {
        try {
          const res = await fetch(`${ADMIN_API}/users/${user.id}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const result = await res.json();
          user.status = result.user.status;
          row.querySelector('.status-cell').textContent = user.status;
        } catch (err) {
          console.error(err);
          alert('Failed to update user status.');
        }
      });
    }

    // ----- View -----
    const viewBtn = row.querySelector('.view');
    if (viewBtn) {
      viewBtn.addEventListener('click', async () => {
        try {
          const res = await fetch(`${ADMIN_API}/users/${user.id}`, {
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const userDetails = await res.json();

          if (modalDetails && modal) {
            modalDetails.innerHTML = `
              <p><strong>Full Name:</strong> ${userDetails.fullName ?? ''}</p>
              <p><strong>Username:</strong> ${userDetails.username ?? ''}</p>
              <p><strong>Email:</strong> ${userDetails.email ?? ''}</p>
              <p><strong>Role:</strong> ${userDetails.role ?? ''}</p>
              <p><strong>Status:</strong> ${userDetails.status ?? ''}</p>
              <p><strong>Joined:</strong> ${userDetails.createdAt ?? ''}</p>
            `;
            modal.classList.remove('hidden');
          }
        } catch (err) {
          console.error(err);
          alert('Unable to view user.');
        }
      });
    }

    // ----- Promote -----
    const promoteBtn = row.querySelector('.promote');
    if (promoteBtn) {
      promoteBtn.addEventListener('click', () => {
        const dlg = document.getElementById('promoteModal');
        if (!dlg) return;
        dlg.classList.remove('hidden');
        document.getElementById('promoteUsernameLabel').textContent =
          `Change role for: ${user.username}`;
        document.getElementById('newRoleSelect').value = user.role;

        document.getElementById('confirmPromoteBtn').onclick = () => {
          const selected = document.getElementById('newRoleSelect').value;
          if (selected && selected !== user.role) {
            promoteUser(user.id, selected);
          }
          dlg.classList.add('hidden');
        };

        document.getElementById('cancelPromoteBtn').onclick =
        document.getElementById('closePromoteModal').onclick = () => {
          dlg.classList.add('hidden');
        };
      });
    }
  });
}

// ---------- Promotion ----------
async function promoteUser(userId, newRole) {
  try {
    const res = await fetch(`${ADMIN_API}/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    alert('User role updated.');
    await loadUsers(); // Refresh table
  } catch (err) {
    console.error(err);
    alert('Failed to promote user.');
  }
}

// ---------- Modal Close ----------
if (closeModalBtn && modal) {
  closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
}

// ---------- Search Filter ----------
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    const filtered = userData.filter(u =>
      (u.fullName  ?? '').toLowerCase().includes(q) ||
      (u.username  ?? '').toLowerCase().includes(q) ||
      (u.email     ?? '').toLowerCase().includes(q)
    );
    renderTable(filtered);
  });
}

// ---------- Initial load ----------
async function loadUsers() {
  try {
    const res = await fetch(`${ADMIN_API}/users`, {
      headers: getAuthHeaders(),
    });

    if (res.status === 401) {
      // bad/expired token → bounce to login
      window.location.href = '../login.html';
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Your controller returns userDB (array)
    const data = await res.json();
    userData = Array.isArray(data) ? data : (data.users || []);
    renderTable(userData);
  } catch (err) {
    console.error('User fetch error:', err);
    alert('Failed to load users.');
  }
}

loadUsers();
