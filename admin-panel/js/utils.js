import { requireAdminAuth } from './auth.js';
import { api } from './api.js';
requireAdminAuth();

await api.get('/admin/users').catch(() => {});
