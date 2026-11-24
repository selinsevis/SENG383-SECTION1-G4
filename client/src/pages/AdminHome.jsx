import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import Layout from './Layout.jsx';
import LinkedSpecialists from './LinkedSpecialists.jsx';

export default function AdminHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const requestId = useRef(0);

  async function refresh() {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const [overview, users, children] = await Promise.all([
        apiFetch('/api/admin/overview'), apiFetch('/api/admin/users'), apiFetch('/api/children'),
      ]);
      if (id === requestId.current) setData({ overview, users, children });
    } catch (err) {
      if (id === requestId.current) setError(err.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    return () => { requestId.current += 1; };
  }, []);

  const selectedChild = data?.children.find((child) => String(child.id) === selectedId)
    || data?.children[0];
  const users = data?.users.filter((user) => (!role || user.role === role)
    && `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <Layout title="Admin operations">
      <div className="admin-heading">
        <p>Development workspace · synthetic data</p>
        <button type="button" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh status'}
        </button>
      </div>
      {error && <p role="alert" className="error">Could not refresh operations: {error}</p>}
      {loading && !data && <p role="status">Loading operations…</p>}
      {data && <>
        <section className="card" aria-labelledby="system-status">
          <h2 id="system-status">System status</h2>
          <dl className="admin-metrics">
            <div><dt>API</dt><dd>{data.overview.status === 'ok' ? 'Healthy' : 'Unavailable'}</dd></div>
            <div><dt>SQLite</dt><dd>{data.overview.database.status === 'ok' ? 'Connected' : 'Unavailable'}</dd></div>
            <div><dt>Foreign keys</dt><dd>{data.overview.database.foreignKeys ? 'Enabled' : 'Disabled'}</dd></div>
            <div><dt>Node.js</dt><dd>{data.overview.runtime.node}</dd></div>
            <div><dt>Server uptime</dt><dd>{data.overview.runtime.uptimeSeconds}s</dd></div>
          </dl>
          <p className="admin-muted">Last successful check: {new Date(data.overview.checkedAt).toLocaleString()}</p>
        </section>
        <section className="admin-counts" aria-label="Record counts">
          {Object.entries({ Users: data.overview.counts.users, Children: data.overview.counts.children,
            'Specialist links': data.overview.counts.specialistLinks, Tasks: data.overview.counts.tasks })
            .map(([label, count]) => <div className="card" key={label}><span>{label}</span><strong>{count}</strong></div>)}
        </section>
        <section className="card" aria-labelledby="admin-users">
          <h2 id="admin-users">User directory</h2>
          <div className="admin-filters">
            <label>Search users<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or email" /></label>
            <label>Filter by role<select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All roles</option>
              {['admin', 'parent', 'specialist', 'child'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select></label>
          </div>
          <div className="admin-table"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Specialism</th></tr></thead>
            <tbody>{users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.specialistType || '—'}</td></tr>)}</tbody>
          </table></div>
          {users.length === 0 && <p>No matching users.</p>}
        </section>
        <section className="card" aria-labelledby="admin-children">
          <h2 id="admin-children">Children and specialist access</h2>
          {data.children.length === 0 ? <p>No children are registered.</p> : <>
            <label>Child<select aria-label="Child" value={selectedChild.id} onChange={(e) => setSelectedId(e.target.value)}>
              {data.children.map((child) => <option key={child.id} value={child.id}>{child.name} (#{child.id})</option>)}
            </select></label>
            <LinkedSpecialists key={selectedChild.id} child={selectedChild} onChange={refresh} />
          </>}
        </section>
      </>}
    </Layout>
  );
}
