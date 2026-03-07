import { supabase } from './supabase.js';

function getApiBase() {
  // In dev, always hit the Vite dev server and let its proxy forward to Render.
  // This keeps the browser origin constant (localhost:3001) and avoids CORS.
  if (import.meta.env.DEV) return '';
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  return 'https://lavitur.onrender.com';
}
const API_BASE = getApiBase();

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

async function request(method, path, options = {}) {
  const token = await getAccessToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `${API_BASE}/api${path}`;
  const res = await fetch(url, { method, headers, credentials: 'include', ...options });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, { body: body ? JSON.stringify(body) : undefined }),
  patch: (path, body) => request('PATCH', path, { body: body ? JSON.stringify(body) : undefined }),
  delete: (path) => request('DELETE', path),
};
