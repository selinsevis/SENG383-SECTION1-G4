import { useAuth } from '../auth.jsx';
import RoleSwitcher from './RoleSwitcher.jsx';

// Common frame for the logged-in pages: who is logged in, and a logout button.
export default function Layout({ title, children }) {
  const { user, logout } = useAuth();
  return (
    <main>
      <RoleSwitcher />
      <header className="topbar">
        <div className="brand"><span className="brand-mark">◈</span><div><strong>Child Development Platform</strong><small>BİRLİKTE GELİŞİM · G4</small></div></div>
        <span>
          {user.name}
          <button type="button" onClick={logout}>Log out</button>
        </span>
      </header>
      <div className="page-kicker">{({parent:'AİLE ALANI',specialist:'UZMAN ÇALIŞMA ALANI',child:'BENİM HAFTAM',admin:'OPERASYON MERKEZİ'})[user.role]}</div>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
