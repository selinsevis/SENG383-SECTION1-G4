import Layout from './Layout.jsx';

// Start page for each role. The content (schedule, tasks, linked specialists)
// is added by M2, M3 and M4.

export function ParentHome() {
  return (
    <Layout title="Parent dashboard">
      <p>Weekly schedule, tasks and linked specialists will appear here.</p>
    </Layout>
  );
}

export function SpecialistHome() {
  return (
    <Layout title="My linked children">
      <p>The children you are linked to will appear here.</p>
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
