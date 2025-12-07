// admin-panel/js/login.js
// Do NOT import requireAdminAuth on the login page.

const existingToken = localStorage.getItem('adminToken');
if (existingToken) {
  window.location.href = 'index.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const usernameOrEmail = e.target.username.value.trim(); // ← key rename
  const password = e.target.password.value.trim();
  const errorMsg = document.getElementById('errorMsg');

  errorMsg.textContent = '';

  if (!usernameOrEmail || !password) {
    errorMsg.textContent = 'Please fill in both fields.';
    return;
  }

  try {
     const response = await fetch('http://localhost:5000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    if (!response.ok) {
      errorMsg.textContent = response.status === 401
        ? 'Invalid username or password.'
        : 'Server error. Try again later.';
      return;
    }

    const data = await response.json();

    if (data.token && (data.role === 'admin' || data.role === 'representative')) {
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminRole', data.role);
      window.location.href = 'index.html';
    } else {
      errorMsg.textContent = 'Unauthorized access.';
    }

  } catch (err) {
    errorMsg.textContent = 'Network error. Check your connection.';
  }
});
