// admin-panel/js/auth.js

export function requireAdminAuth() {
  const token = localStorage.getItem('adminToken');
  const role  = localStorage.getItem('adminRole');

  if (!token || (role !== 'admin' && role !== 'representative')) {
    // use absolute path
    location.replace('/admin-panel/login.html');
    return;
  }

  // Prevent cached pages being shown after logout
  window.addEventListener('pageshow', (event) => {
    const nav = performance.getEntriesByType('navigation')[0];
    const back = nav && nav.type === 'back_forward';
    if (event.persisted || back) location.reload();
  });
}

export function getAuthHeaders() {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    window.location.href = '/admin-panel/login.html';
  });
}
