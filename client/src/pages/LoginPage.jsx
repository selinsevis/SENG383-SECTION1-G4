import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from '../auth.jsx';

// FR-M1-01, FR-M1-02, FR-M1-03: email and password only; the role comes from the account.
export default function LoginPage() {
  const { user, checking, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  // Already logged in: go straight to the start page of this role.
  if (!checking && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    setError(null);
    setSending(true);
    try {
      const loggedIn = await login(email, password);
      navigate(HOME_BY_ROLE[loggedIn.role], { replace: true });
    } catch (err) {
      setError(err.message); // e.g. "Invalid email or password"
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="login">
      <h1>Child Development Platform</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" disabled={sending}>{sending ? 'Logging in…' : 'Log in'}</button>
      </form>
    </main>
  );
}
