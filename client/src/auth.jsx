import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, getToken, saveToken } from './api.js';

// Keeps the logged-in user for the whole app, so every page can ask "who is logged in?".
const AuthContext = createContext(null);

// Each role has its own start page (FR-M1-04).
export const HOME_BY_ROLE = {
  parent: '/parent',
  specialist: '/specialist',
  child: '/child',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // While we check a saved token after a page refresh, we do not know the user yet.
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    apiFetch('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => saveToken(null)) // expired or invalid token: forget it
      .finally(() => setChecking(false));
  }, []);

  async function login(email, password) {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    saveToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
