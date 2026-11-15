import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from '../auth.jsx';

const ROLES = [['admin', 'Admin'], ['parent', 'Ebeveyn'], ['specialist', 'Uzman'], ['child', 'Çocuk']];

export default function RoleSwitcher() {
  const { user, adminUser, switchRole } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState(null);
  if (!adminUser) return null;

  async function selectRole(role) {
    if (switching || role === user.role) return;
    setSwitching(true);
    setError(null);
    try {
      const nextUser = await switchRole(role);
      navigate(HOME_BY_ROLE[nextUser.role], { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <aside className="role-switcher" aria-label="Admin rol testi">
      <div className="role-switcher-row">
        <strong>Rol testi</strong>
        <div className="role-switcher-buttons" role="group" aria-label="Test edilecek rol">
          {ROLES.map(([role, label]) => <button key={role} type="button"
            aria-pressed={user.role === role} disabled={switching}
            onClick={() => selectRole(role)}>{label}</button>)}
        </div>
        <span>{user.email}</span>
      </div>
      {switching && <p role="status">Rol değiştiriliyor…</p>}
      {user.role !== 'admin' && <p>Demo hesabının yetkileriyle test ediyorsun. Admin butonuyla panele dönebilirsin.</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </aside>
  );
}
