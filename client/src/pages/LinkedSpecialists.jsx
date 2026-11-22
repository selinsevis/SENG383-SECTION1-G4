import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';

const TYPES = [
  ['teacher', 'Teacher'],
  ['psychologist', 'Psychologist'],
  ['doctor', 'Doctor'],
  ['special_education_teacher', 'Special education teacher'],
  ['coach', 'Coach'],
];
const typeLabel = (value) => (TYPES.find(([v]) => v === value) || [value, value])[1];

// M2 for the parent: link a specialist by email (FR-M2-01, FR-M2-02),
// see the linked specialists (FR-M2-03) and unlink with a confirmation step (FR-M2-04).
export default function LinkedSpecialists({ child }) {
  const [specialists, setSpecialists] = useState([]);
  const [email, setEmail] = useState('');
  const [type, setType] = useState('teacher');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null); // which row shows "Are you sure?"

  const base = `/api/children/${child.id}/specialists`;

  useEffect(() => {
    apiFetch(base).then(setSpecialists).catch((err) => setError(err.message));
  }, [base]);

  async function handleLink(event) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch(base, { method: 'POST', body: { email, specialistType: type } });
      setSpecialists(updated);
      setMessage(`${email.trim()} is now linked to ${child.name}.`);
      setEmail('');
    } catch (err) {
      setError(err.message); // e.g. "No registered specialist with this email"
    }
  }

  async function handleUnlink(specialist) {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`${base}/${specialist.id}`, { method: 'DELETE' });
      setSpecialists((list) => list.filter((s) => s.id !== specialist.id));
      setMessage(`${specialist.name} was unlinked and can no longer see ${child.name}'s data.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <section className="card">
      <h2>Linked specialists</h2>

      <form className="inline-form" onSubmit={handleLink}>
        <label>
          Specialist email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="submit">Link specialist</button>
      </form>

      {error && <p role="alert" className="error">{error}</p>}
      {message && <p role="status" className="success">{message}</p>}

      {specialists.length === 0 ? (
        <p>No specialists are linked to {child.name} yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Type</th><th aria-label="Actions" /></tr>
          </thead>
          <tbody>
            {specialists.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{typeLabel(s.specialistType)}</td>
                <td>
                  <div className="actions">
                  {confirmingId === s.id ? (
                    <>
                      <span>Unlink {s.name}?</span>
                      <button type="button" className="danger" onClick={() => handleUnlink(s)}>Yes, unlink</button>
                      <button type="button" className="secondary" onClick={() => setConfirmingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <button type="button" className="secondary" onClick={() => setConfirmingId(s.id)}>Unlink</button>
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
