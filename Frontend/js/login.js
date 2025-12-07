async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const errorBox = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-button');
  const togglePassword = document.getElementById('toggle-password');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  }

  function hideError() {
    errorBox.textContent = '';
    errorBox.style.display = 'none';
  }

  function disableForm(disable) {
    usernameInput.disabled = disable;
    passwordInput.disabled = disable;
    loginBtn.disabled = disable;
  }

  async function authenticate(username, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const hashedPassword = await hashPassword(password);
    return users.find(u => u.username === username && u.password === hashedPassword) || null;
  }

  function loginUser(user) {
    const token = `${user.role}-${Date.now()}`;
    localStorage.setItem('lavitur_user', JSON.stringify({ username: user.username, fullName: user.fullName, role: user.role }));
    localStorage.setItem('authToken', token);
    localStorage.setItem('authRole', user.role);
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    hideError();
    disableForm(true);

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Simulated server delay
    setTimeout(async () => {
      const user = await authenticate(username, password);
      if (user) {
  if (user.role === 'admin') {
    showError('Admins must use the admin login page.');
    disableForm(false);
    return;
  }

  loginUser(user);
  window.location.href = 'profile.html';
} else {
  showError('Invalid username or password.');
  disableForm(false);
}
    }, 600);
  });

  togglePassword.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePassword.classList.toggle('fa-eye-slash', isHidden);
  });
});
