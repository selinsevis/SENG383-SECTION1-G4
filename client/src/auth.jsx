import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, getToken, saveToken, savePreviewRole } from './api.js';

// Keeps the logged-in user for the whole app, so every page can ask "who is logged in?".
const AuthContext = createContext(null);

// Each role has its own start page (FR-M1-04).
export const HOME_BY_ROLE = {
  admin: '/admin',
  parent: '/parent',
  specialist: '/specialist',
  child: '/child',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  // While we check a saved token after a page refresh, we do not know the user yet.
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    apiFetch('/api/auth/me')
      .then((data) => {
        setUser(data.user);
        setAdminUser(data.adminUser);
      })
      .catch(async (err) => {
        // If a demo account was removed, recover the underlying admin session.
        if (err.status === 400 || err.status === 403 || err.status === 404) {
          savePreviewRole('');
          try {
            const data = await apiFetch('/api/auth/me', { previewRole: '' });
            setUser(data.user);
            setAdminUser(data.adminUser);
            return;
          } catch { /* Invalid underlying session: clear it below. */ }
        }
        saveToken(null);
        savePreviewRole('');
      })
      .finally(() => setChecking(false));
  }, []);

  async function login(email, password) {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password }, previewRole: '' });
    saveToken(data.token);
    savePreviewRole('');
    setUser(data.user);
    setAdminUser(data.user.role === 'admin' ? data.user : null);
    return data.user;
  }

  function logout() {
    saveToken(null);
    savePreviewRole('');
    setUser(null);
    setAdminUser(null);
  }

  async function switchRole(role) {
    const previewRole = role === 'admin' ? '' : role;
    const data = await apiFetch('/api/auth/me', { previewRole });
    savePreviewRole(previewRole);
    setUser(data.user);
    setAdminUser(data.adminUser);
    return data.user;
  }

  return (
    <AuthContext.Provider value={{ user, adminUser, checking, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
