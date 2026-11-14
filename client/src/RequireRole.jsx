import { Navigate } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from './auth.jsx';

// Shows the page only to the given role (FR-M1-04).
// Not logged in -> login page. Wrong role -> that user's own start page.
// This only hides screens; the real permission check is always done again by the backend.
export default function RequireRole({ role, children }) {
  const { user, checking } = useAuth();

  if (checking) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return children;
}
