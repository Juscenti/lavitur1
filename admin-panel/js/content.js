import { requireAdminAuth } from './auth.js';
requireAdminAuth();

const token = localStorage.getItem('adminToken');

const response = await fetch('/api/admin/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
