import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';

// Loads the children the logged-in user may see (GET /api/children).
export default function useChildren() {
  const [children, setChildren] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/children').then(setChildren).catch((err) => setError(err.message));
  }, []);

  return { children, error };
}
