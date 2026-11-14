import { useEffect, useState } from 'react';

// Walking skeleton: React asks the backend for the tasks, Express reads them from SQLite,
// and the tasks appear in the browser. This shows the whole chain works end to end.
export default function App() {
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/tasks')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setTasks)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main>
      <h1>Child Development Platform</h1>
      <p>Walking skeleton (v0.0): tasks below come from the database.</p>
      {error && <p role="alert">Could not load tasks: {error}</p>}
      {!error && !tasks && <p>Loading tasks…</p>}
      {tasks && tasks.length === 0 && <p>No tasks in the database.</p>}
      {tasks && tasks.length > 0 && (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              {task.title} – {task.status}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
