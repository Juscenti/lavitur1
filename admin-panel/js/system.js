import { ADMIN_API } from './api.js';
import { requireAdminAuth, getAuthHeaders } from './auth.js';

requireAdminAuth();

(async function init() {
  const res = await fetch(`${ADMIN_API}/users`, {
    headers: getAuthHeaders(), // adds Authorization: Bearer <token>
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // use data...
})();
