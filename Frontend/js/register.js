// Hashing function
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Redirect if already logged in
if (localStorage.getItem('authToken')) {
  window.location.replace('index.html');
}

// Error display
function showError(inputId, message) {
  const errorDiv = document.getElementById(inputId + '-error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// Clear errors
function clearErrors() {
  const errorDivs = document.querySelectorAll('.error-message');
  errorDivs.forEach(div => {
    div.textContent = '';
    div.style.display = 'none';
  });
}

// Generate the next unique account number
function getNextAccountNumber(role) {
  let current = parseInt(localStorage.getItem('lastAccountNumber') || '0', 10);
  if (role === 'admin' && current < 1) {current = 0;} // First admin will be 1
  else if (role === 'customer' && current < 1000) {current = 999;} // First customer will be 1000
  current += 1;
  localStorage.setItem('lastAccountNumber', current.toString());
  return current;
}

// Registration handler
document.getElementById('register-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  clearErrors();

  const fullName  = document.getElementById('fullname').value.trim();
  const username  = document.getElementById('username').value.trim();
  const email     = document.getElementById('email').value.trim();
  const password  = document.getElementById('password').value;
  const confirm   = document.getElementById('confirm').value;
  const adminCode = document.getElementById('admincode').value.trim();

  let hasError = false;

  const usernameRegex = /^[a-zA-Z0-9._]+$/;
  if (!usernameRegex.test(username)) {
    showError('username', 'Username can only contain letters, numbers, dots, and underscores.');
    hasError = true;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError('email', 'Please enter a valid email address.');
    hasError = true;
  }

  const pwdRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
  if (!pwdRegex.test(password)) {
    showError('password', 'Password must be ≥8 characters, include a number & a special character.');
    hasError = true;
  }

  if (password !== confirm) {
    showError('confirm', 'Passwords do not match.');
    hasError = true;
  }

  const users = JSON.parse(localStorage.getItem('users') || '[]');

  if (users.some(u => u.username === username)) {
    showError('username', 'Username already taken.');
    hasError = true;
  }

  if (users.some(u => u.email === email)) {
    showError('email', 'Email is already registered.');
    hasError = true;
  }

  if (hasError) return;

  const role = (adminCode === '@dm1nL0g1n') ? 'admin' : 'customer';

  const hashedPassword = await hashPassword(password);
  const accountNumber = getNextAccountNumber(role);

  const newUser = {
    accountNumber,
    username,
    fullName,
    email,
    password: hashedPassword,
    role
  };

  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));

  const token = `${role}-${Date.now()}`;
  localStorage.setItem('authToken', token);
  localStorage.setItem('authRole', role);
  localStorage.setItem('lavitur_user', JSON.stringify({
    accountNumber,
    username,
    fullName,
    role
  }));

  window.location.replace('index.html');
});

// Password Feedback UI
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm');

const pwdFeedback = document.createElement('small');
const confirmFeedback = document.createElement('small');

passwordInput.parentNode.appendChild(pwdFeedback);
confirmInput.parentNode.appendChild(confirmFeedback);

const pwdRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

const handlePasswordValidation = () => {
  if (!pwdRegex.test(passwordInput.value)) {
    pwdFeedback.textContent = 'Password must be ≥8 chars, include a number & special char.';
    pwdFeedback.style.color = 'red';
  } else {
    pwdFeedback.textContent = 'Password looks good!';
    pwdFeedback.style.color = 'green';
  }
};

const handleConfirmValidation = () => {
  if (confirmInput.value !== passwordInput.value) {
    confirmFeedback.textContent = "Passwords don't match.";
    confirmFeedback.style.color = 'red';
  } else {
    confirmFeedback.textContent = "Passwords match.";
    confirmFeedback.style.color = 'green';
  }
};

passwordInput.addEventListener('input', debounce(handlePasswordValidation, 500));
confirmInput.addEventListener('input', debounce(handleConfirmValidation, 500));
