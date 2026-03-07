import { api } from './api.js';
import { requireAdminAuth } from './auth.js';

requireAdminAuth();

(async function init() {
  await api.get('/admin/users').catch(() => {});
})();
