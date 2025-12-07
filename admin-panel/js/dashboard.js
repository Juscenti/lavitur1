// admin-panel/js/dashboard.js
import { requireAdminAuth, getAuthHeaders } from './auth.js';
import { ADMIN_API } from './api.js';

// 1) Gate the page
requireAdminAuth();

// 2) (Optional) Quick auth sanity check against the API.
//    If it fails (token missing/expired), bounce to login.
//    Remove this whole block if you don't want a call here.
(async () => {
  try {
    const res = await fetch(`${ADMIN_API}/users`, { headers: getAuthHeaders() });
    if (res.status === 401) {
      // clear bad token FIRST, then go to login
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRole');
      location.replace('/admin-panel/login.html'); // absolute path
      return;
    }
    // You don't actually use the result for the dashboard cards,
    // so we don't parse it here.
  } catch (e) {
    console.warn('Auth check failed:', e);
    // Keep page visible, or redirect if you prefer:
    // window.location.href = 'login.html';
  }
})();

// 3) Inject sidebar and header, then set up the dashboard UI
window.addEventListener('DOMContentLoaded', () => {
  loadComponent('components/sidebar.html', '#sidebar');
  loadComponent('components/header.html', '#topbar');

    // Demo stats (replace with real endpoints later)
  const byId = (id) => document.getElementById(id);
  const salesEl   = byId('sales-total');
  const ordersEl  = byId('orders-today');
  const newUsers  = byId('new-users');
  const ticketsEl = byId('open-tickets');

  if (salesEl)  salesEl.textContent = '$21,430.00';
  if (ordersEl) ordersEl.textContent = '87';
  if (newUsers) newUsers.textContent = '14';
  if (ticketsEl) ticketsEl.textContent = '5';

  // Chart.js example (make sure Chart.js is loaded on the page)
  const canvas = document.getElementById('salesChart');
  if (canvas && window.Chart) {
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Weekly Sales',
          data: [2100, 3100, 1800, 4500, 3500, 5000, 4300],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3B82F6',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } }
      }
    });
  }
});

// Helper to inject component HTML
function loadComponent(path, selector) {
  fetch(path)
    .then(res => res.text())
    .then(html => {
      const el = document.querySelector(selector);
      if (el) el.innerHTML = html;
    })
    .catch(err => console.error(`Failed to load ${path}`, err));
}

// Logout wiring (button lives inside header/sidebar component)
document.addEventListener('DOMContentLoaded', () => {
  // The button is added after components load; delegate or re-bind after injection.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#adminLogoutBtn');
    if (!btn) return;

    // Clear admin/local session
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authRole');
    window.location.href = 'login.html';
  });
});
