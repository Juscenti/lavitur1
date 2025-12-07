document.addEventListener('DOMContentLoaded', () => {
  // Redirect if not authenticated
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.replace('account.html');
    return;
  }

  // Load current user data
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const form = document.getElementById('settings-form');

  // Prefill form
  document.getElementById('fullname').value = currentUser.fullName || '';
  document.getElementById('email').value    = currentUser.email    || '';

  form.addEventListener('submit', e => {
    e.preventDefault();

    const newFull = document.getElementById('fullname').value.trim();
    const newEmail = document.getElementById('email').value.trim();
    const newPwd   = document.getElementById('password').value;

    // Update users array
    const updatedUsers = users.map(u => {
      if (u.username === currentUser.username) {
        u.fullName = newFull;
        u.email    = newEmail;
        if (newPwd) u.password = newPwd;
      }
      return u;
    });
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Update currentUser in session
    const updatedCurrent = { ...currentUser, fullName: newFull, email: newEmail };
    localStorage.setItem('currentUser', JSON.stringify(updatedCurrent));

    alert('Settings updated successfully.');
  });
});
