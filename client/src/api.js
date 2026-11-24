// One place for every request to our backend.
// It adds the login token and turns error responses into JavaScript errors.

const TOKEN_KEY = 'g4-token';
const PREVIEW_KEY = 'g4-preview-role';

export function getPreviewRole() {
  return sessionStorage.getItem(PREVIEW_KEY) || '';
}

export function savePreviewRole(role) {
  if (role) sessionStorage.setItem(PREVIEW_KEY, role);
  else sessionStorage.removeItem(PREVIEW_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, { method = 'GET', body, previewRole = getPreviewRole(), responseType = 'json' } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (token && previewRole) headers['X-Preview-Role'] = previewRole;
  const multipart = body instanceof FormData;
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || `Request failed (HTTP ${res.status})`);
    error.status = res.status;
    throw error;
  }
  return responseType === 'blob' ? res.blob() : res.json().catch(() => ({}));
}
