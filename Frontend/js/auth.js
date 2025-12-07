// auth.js

// --- Users storage ---
export function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '[]');
}

export function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

// --- Duplicate check ---
export function checkDuplicates(users, username, email) {
  return {
    username: users.some(u => u.username === username),
    email: users.some(u => u.email === email)
  };
}

// --- Password hashing ---
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Authenticate user by username and password ---
export async function authenticateUser(username, password) {
  const users = getUsers();
  // Passwords are hashed on registration
  const hashedInputPwd = await hashPassword(password);
  return users.find(u => u.username === username && u.password === hashedInputPwd) || null;
}

// --- Role assignment ---
export function determineRole(adminCode) {
  return adminCode === '@dm1nL0g1n' ? 'admin' : 'customer';
}

// --- Set logged-in user auth state ---
export function setAuthState(user) {
  const token = `${user.role}-${Date.now()}`;
  localStorage.setItem('authToken', token);
  localStorage.setItem('authRole', user.role);
  localStorage.setItem('lavitur_user', JSON.stringify({
    username: user.username,
    fullName: user.fullName,
    role: user.role
  }));
}

// --- Clear auth state ---
export function clearAuthState() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authRole');
  localStorage.removeItem('lavitur_user');
}
