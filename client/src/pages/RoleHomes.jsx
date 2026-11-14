import Layout from './Layout.jsx';
import LinkedSpecialists from './LinkedSpecialists.jsx';
import useChildren from './useChildren.js';

// Start page for each role. M3 (schedule) and M4 (tasks) add their sections here.

function ChildrenState({ error, children }) {
  if (error) return <p role="alert" className="error">Could not load children: {error}</p>;
  if (!children) return <p>Loading…</p>;
  return null;
}

export function ParentHome() {
  const { children, error } = useChildren();
  return (
    <Layout title="Parent dashboard">
      <ChildrenState error={error} children={children} />
      {children && children.length === 0 && <p>No child is registered for this account.</p>}
      {children && children.map((child) => (
        <div key={child.id}>
          <h2 className="child-name">{child.name}</h2>
          <LinkedSpecialists child={child} />
        </div>
      ))}
    </Layout>
  );
}

// FR-M2-06: a specialist sees only the children they are linked to.
export function SpecialistHome() {
  const { children, error } = useChildren();
  return (
    <Layout title="My linked children">
      <ChildrenState error={error} children={children} />
      {children && children.length === 0 && (
        <p>You are not linked to any child yet. A parent can link you by your email.</p>
      )}
      {children && children.length > 0 && (
        <ul className="list">
          {children.map((child) => <li key={child.id}>{child.name}</li>)}
        </ul>
      )}
    </Layout>
  );
}

export function ChildHome() {
  return (
    <Layout title="My tasks">
      <p>Your tasks and this week's events will appear here.</p>
    </Layout>
  );
}
