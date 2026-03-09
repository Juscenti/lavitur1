import { supabase } from './supabase.js';

const RENDER_API_URL = 'https://lavitur.onrender.com';

const API_BASE = import.meta.env.VITE_API_BASE || RENDER_API_URL;
const TOKEN_KEY = 'adminToken';

async function getToken() {
  try {
    const { data } = await supabase.auth.getSession();
    const sessionToken = data?.session?.access_token;
    if (sessionToken) {
      localStorage.setItem(TOKEN_KEY, sessionToken);
      return sessionToken;
    }
  } catch (_) {}
  return localStorage.getItem(TOKEN_KEY);
}

async function request(method, path, options = {}) {
  const token = await getToken();
  const hasBody = typeof options.body === 'string' && options.body.length > 0;
  const headers = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${API_BASE}/api${path}`;
  let credentials = 'same-origin';
  if (typeof window !== 'undefined' && window.location.origin) {
    try {
      credentials = new URL(url).origin !== window.location.origin ? 'include' : 'same-origin';
    } catch (_) {}
  }
  const fetchOpts = { method, headers, credentials };
  if (hasBody) fetchOpts.body = options.body;

  let res;
  try {
    res = await fetch(url, fetchOpts);
  } catch (networkErr) {
    const isNetworkError = networkErr?.name === 'TypeError' || networkErr?.message === 'Failed to fetch';
    const err = new Error(networkErr?.message || 'Network error');
    err.status = 0;
    err.data = null;
    throw err;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (!res.ok) {
    const message = data?.error || res.statusText || (text ? `${res.status} - ${text.slice(0, 150)}` : `Request failed (${res.status})`);
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    err.responseText = text;
    throw err;
  }
  return data;
}

async function requestMultipart(method, path, formData) {
  const token = await getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${API_BASE}/api${path}`;
  let credentials = 'same-origin';
  if (typeof window !== 'undefined' && window.location.origin) {
    try {
      credentials = new URL(url).origin !== window.location.origin ? 'include' : 'same-origin';
    } catch (_) {}
  }
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials,
      body: formData,
    });
  } catch (networkErr) {
    const isNetworkError = networkErr?.name === 'TypeError' || networkErr?.message === 'Failed to fetch';
    const err = new Error(networkErr?.message || 'Network error');
    err.status = 0;
    err.data = null;
    throw err;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {}

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
  delete: (path, body) => request('DELETE', path, { body: body ? JSON.stringify(body) : undefined }),
  upload: (path, formData) => requestMultipart('POST', path, formData),
};

export default api;
