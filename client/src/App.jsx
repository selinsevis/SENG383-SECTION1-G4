import { useEffect, useState } from 'react';

// Walking skeleton: the page asks the backend for its health status.
// If the backend and the database answer, the whole chain (React -> Express -> SQLite) works.
export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main>
      <h1>Child Development Platform</h1>
      <p>Walking skeleton (v0.0)</p>
      {error && <p role="alert">Backend not reachable: {error}</p>}
      {!error && !health && <p>Checking backend…</p>}
      {health && (
        <p>
          Backend: {health.status} · Database: {health.db}
        </p>
      )}
    </main>
  );
}
