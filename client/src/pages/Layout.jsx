import { useAuth } from '../auth.jsx';

// Common frame for the logged-in pages: who is logged in, and a logout button.
export default function Layout({ title, children }) {
  const { user, logout } = useAuth();
  return (
    <main>
      <header className="topbar">
        <strong>Child Development Platform</strong>
        <span>
          {user.name}
          <button type="button" onClick={logout}>Log out</button>
        </span>
      </header>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
