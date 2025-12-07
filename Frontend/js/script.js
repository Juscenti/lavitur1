document.addEventListener('DOMContentLoaded', () => {
  // Admin fail-safe: ensure default admin exists
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const hasAdmin = users.some(u => u.role === 'admin');

  if (!hasAdmin) {
    (async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode('@dm1nL0g1n');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const defaultAdmin = {
        accountNumber: 1,
        username: 'Juscent1theAdm1n.',
        fullName: 'Default Admin',
        email: 'admin@lavitur.com',
        password: '@dm1nL0g1n',
        role: 'admin'
      };

      users.push(defaultAdmin);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('lastAccountNumber', '1');
    })();
  }

  // Dropdown rendering logic
  const dropdownList = document.querySelector('.account-dropdown .dropdown-content');
  const token = localStorage.getItem('authToken');
  const role  = localStorage.getItem('authRole');      
  const items = [];

  if (token) {
    if (role === 'admin') {
      items.push({ text: 'Admin Dashboard', href: '../../admin-panel/index.html' });
    }
    items.push({ text: 'Profile', href: 'profile.html' });
    items.push({ text: 'Log Out', href: '#', action: 'logout' });
  } else {
    items.push({ text: 'Log In/Register', href: 'account.html' });
  }

  dropdownList.innerHTML = items.map(item => {
    if (item.action === 'logout') {
      return `<li><a href="#" data-action="logout">${item.text}</a></li>`;
    }
    return `<li><a href="${item.href}">${item.text}</a></li>`;
  }).join('');

  // Logout handler
  dropdownList.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      localStorage.removeItem('authToken');
      localStorage.removeItem('authRole');
      localStorage.removeItem('lavitur_user');
      window.location.href = 'index.html';
    });
  });
});
