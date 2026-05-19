const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const TOKEN_KEY = 'apex_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) ?? null;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

/* ── Track if we already redirected to avoid loops ─────────────────────────── */
let redirecting = false;

function handleUnauthorized() {
  if (redirecting) return;
  redirecting = true;
  clearSession();
  // Give any in-flight toasts a moment to clear, then hard redirect
  setTimeout(() => {
    window.location.href = '/';
    redirecting = false;
  }, 100);
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Add cache-busting query param for GET requests
  let url = `${BASE_URL}${path}`;
  if (method === 'GET') {
    const separator = path.includes('?') ? '&' : '?';
    url += `${separator}t=${Date.now()}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  /* ── 401 — session expired or invalid token ─────────────────────────────── */
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const err = await res.json();
      message = err.message ?? err.error ?? message;
    } catch (_) {}
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
};

export default api;
