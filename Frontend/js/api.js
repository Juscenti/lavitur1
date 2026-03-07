/**
 * Frontend API client — all data requests go to the REST API.
 * Auth (login/register/logout) stays with Supabase client; this uses the session token for API calls.
 */
const API_BASE = typeof window !== 'undefined' && window.API_BASE
  ? window.API_BASE
  : 'https://lavitur.onrender.com';

async function getAccessToken() {
  try {
    const { supabase } = await import('./supabaseClient.js');
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch (_) {
    return null;
  }
}

async function request(method, path, options = {}) {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${API_BASE}/api${path}`;
  let isCrossOrigin = false;
  if (typeof window !== 'undefined' && window.location.origin) {
    try {
      const apiOrigin = new URL(url).origin;
      isCrossOrigin = window.location.origin !== apiOrigin;
    } catch (_) {}
  }
  const res = await fetch(url, {
    method,
    headers,
    credentials: isCrossOrigin ? 'include' : 'same-origin',
    ...options,
  });

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
  delete: (path) => request('DELETE', path),
};

export default api;
