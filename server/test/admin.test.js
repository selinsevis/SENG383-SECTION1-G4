const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { openDatabase, seedDatabase, ADMIN_EMAIL, ADMIN_PASSWORD, DEMO_PASSWORD } = require('../src/database');
const { createApp } = require('../src/app');

const SECRET = 'admin-test-secret';
let db;
let app;

beforeEach(() => {
  db = openDatabase(':memory:');
  seedDatabase(db);
  app = createApp(db, { jwtSecret: SECRET });
});
afterEach(() => db.close());

async function login(email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  const response = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return { Authorization: `Bearer ${response.body.token}` };
}

test('admin credentials are hashed, login works and seed never resets the password', async () => {
  const account = db.prepare('SELECT * FROM users WHERE email = ?').get(ADMIN_EMAIL);
  expect(account.role).toBe('admin');
  expect(bcrypt.compareSync(ADMIN_PASSWORD, account.password_hash)).toBe(true);
  expect(account.password_hash).not.toBe(ADMIN_PASSWORD);
  const auth = await login();
  const me = await request(app).get('/api/auth/me').set(auth).expect(200);
  expect(me.body.user).toMatchObject({ email: ADMIN_EMAIL, role: 'admin' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync('Changed-password', 4), account.id);
  seedDatabase(db);
  await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(401);
  await login(ADMIN_EMAIL, 'Changed-password');
  expect(db.prepare("SELECT count(*) AS total FROM users WHERE role = 'admin'").get().total).toBe(1);
});

test('operations overview and user directory omit secrets and return real record counts', async () => {
  const auth = await login();
  const overview = await request(app).get('/api/admin/overview').set(auth).expect(200);
  expect(overview.headers['cache-control']).toBe('no-store');
  expect(overview.body).toMatchObject({ status: 'ok', database: { status: 'ok', foreignKeys: true },
    counts: { users: 5, children: 1, specialistLinks: 1, tasks: 1 } });
  expect(overview.body.runtime.uptimeSeconds).toBeGreaterThanOrEqual(0);
  const users = await request(app).get('/api/admin/users').set(auth).expect(200);
  expect(users.body).toHaveLength(5);
  for (const user of users.body) {
    expect(Object.keys(user).sort()).toEqual(['email', 'id', 'name', 'role', 'specialistType']);
  }
});

test.each(['parent@demo.test', 'teacher@demo.test', 'psychologist@demo.test', 'child@demo.test'])(
  '%s cannot read admin data or gain admin privileges by choosing a role', async (email) => {
    for (const endpoint of ['/api/admin/overview', '/api/admin/users']) {
      await request(app).get(endpoint).expect(401);
      await request(app).get(endpoint).set(await login(email, DEMO_PASSWORD)).expect(403);
    }
    const response = await request(app).post('/api/auth/login')
      .send({ email, password: DEMO_PASSWORD, role: 'admin' }).expect(200);
    expect(response.body.user.role).not.toBe('admin');
  },
);

test('server checks the current role even if the JWT claims admin', async () => {
  const forgedRole = jwt.sign({ sub: 1, role: 'admin' }, SECRET);
  await request(app).get('/api/admin/users').set('Authorization', `Bearer ${forgedRole}`).expect(403);
  const auth = await login();
  db.prepare("UPDATE users SET role = 'parent' WHERE email = ?").run(ADMIN_EMAIL);
  await request(app).get('/api/admin/users').set(auth).expect(403);
});

test('admin sees all children and manages links while ordinary parent access stays isolated', async () => {
  db.prepare("INSERT INTO users VALUES (50, 'Other parent', 'other@demo.test', 'x', 'parent', NULL)").run();
  db.prepare("INSERT INTO children (id, parent_id, name) VALUES (2, 50, 'Other child')").run();
  const admin = await login();
  const parent = await login('parent@demo.test', DEMO_PASSWORD);
  const children = await request(app).get('/api/children').set(admin).expect(200);
  expect(children.body.map((child) => child.id).sort()).toEqual([1, 2]);
  await request(app).get('/api/children/2/specialists').set(parent).expect(403);
  const teacher = await login('teacher@demo.test', DEMO_PASSWORD);
  await request(app).post('/api/children/2/specialists').set(admin)
    .send({ email: 'teacher@demo.test', specialistType: 'teacher' }).expect(201);
  await request(app).get('/api/children/2/specialists').set(teacher).expect(200);
  await request(app).delete('/api/children/2/specialists/2').set(admin).expect(204);
  await request(app).get('/api/children/2/specialists').set(teacher).expect(403);
  await request(app).get('/api/children/999/specialists').set(admin).expect(404);
});

test('legacy database migration preserves records, hashes, foreign keys, indexes and triggers', () => {
  const legacy = openDatabase(':memory:');
  try {
    legacy.exec(`CREATE TABLE users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('parent', 'specialist', 'child')),
      specialist_type TEXT);
      INSERT INTO users VALUES (1, 'Existing parent', 'parent@demo.test', 'original-hash', 'parent', NULL);
      CREATE TABLE children (id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES users(id),
        user_id INTEGER UNIQUE REFERENCES users(id), name TEXT NOT NULL);
      INSERT INTO children VALUES (8, 1, NULL, 'Existing child');
      CREATE TABLE name_changes (user_id INTEGER);
      CREATE INDEX users_by_name ON users(name);
      CREATE TRIGGER track_name AFTER UPDATE OF name ON users
        BEGIN INSERT INTO name_changes VALUES (NEW.id); END;`);
    seedDatabase(legacy);
    seedDatabase(legacy);
    expect(legacy.prepare('SELECT name, password_hash FROM users WHERE id = 1').get())
      .toEqual({ name: 'Existing parent', password_hash: 'original-hash' });
    expect(legacy.prepare('SELECT name FROM children WHERE id = 8').get().name).toBe('Existing child');
    expect(legacy.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(legacy.pragma('foreign_key_check')).toEqual([]);
    expect(legacy.prepare("SELECT name FROM sqlite_master WHERE name = 'users_by_name'").get()).toBeTruthy();
    legacy.prepare("UPDATE users SET name = 'Updated' WHERE id = 1").run();
    expect(legacy.prepare('SELECT * FROM name_changes').all()).toEqual([{ user_id: 1 }]);
    expect(() => legacy.prepare('DELETE FROM users WHERE id = 1').run()).toThrow();
    expect(legacy.prepare('SELECT role FROM users WHERE email = ?').get(ADMIN_EMAIL).role).toBe('admin');
  } finally {
    legacy.close();
  }
});

test('seed refuses to silently promote an existing non-admin with the admin email', () => {
  db.prepare("DELETE FROM users WHERE role = 'admin'").run();
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Existing', ?, 'hash', 'parent')").run(ADMIN_EMAIL);
  expect(() => seedDatabase(db)).toThrow('Admin email is already used');
  expect(db.prepare('SELECT role FROM users WHERE email = ?').get(ADMIN_EMAIL).role).toBe('parent');
});

test.each([
  ['parent', 'parent@demo.test', 1],
  ['specialist', 'teacher@demo.test', 2],
  ['child', 'child@demo.test', 4],
])('admin previews %s using the demo account permissions and can return to admin', async (role, email, id) => {
  const admin = await login();
  const preview = { ...admin, 'X-Preview-Role': role };
  const me = await request(app).get('/api/auth/me').set(preview).expect(200);
  expect(me.body.user).toMatchObject({ role, email, id });
  expect(me.body.adminUser).toMatchObject({ role: 'admin', email: ADMIN_EMAIL });
  expect(me.headers['cache-control']).toBe('no-store');
  await request(app).get('/api/admin/users').set(preview).expect(403);
  const children = await request(app).get('/api/children').set(preview).expect(200);
  expect(children.body.map((child) => child.id)).toEqual([1]);
  await request(app).post('/api/children/1/specialists').set(preview)
    .send({ email: 'psychologist@demo.test', specialistType: 'psychologist' })
    .expect(role === 'parent' ? 201 : 403);
  await request(app).get('/api/admin/users').set(admin).expect(200);
  const restored = await request(app).get('/api/auth/me').set(admin).expect(200);
  expect(restored.body.user.role).toBe('admin');
});

test('preview specialist follows link changes immediately instead of retaining admin access', async () => {
  const admin = await login();
  const preview = { ...admin, 'X-Preview-Role': 'specialist' };
  await request(app).delete('/api/children/1/specialists/2').set(admin).expect(204);
  await request(app).get('/api/children/1/specialists').set(preview).expect(403);
  await request(app).get('/api/children').set(preview).expect(200, []);
});

test.each(['parent@demo.test', 'teacher@demo.test', 'child@demo.test'])(
  'ordinary %s cannot use the preview header', async (email) => {
    await request(app).get('/api/auth/me')
      .set({ ...await login(email, DEMO_PASSWORD), 'X-Preview-Role': 'parent' }).expect(403);
  },
);

test('invalid, missing or reassigned demo roles cannot bypass authorization', async () => {
  const admin = await login();
  for (const role of ['admin', '__proto__', 'unknown']) {
    await request(app).get('/api/auth/me').set({ ...admin, 'X-Preview-Role': role }).expect(400);
  }
  db.prepare("UPDATE users SET email = 'renamed@demo.test' WHERE id = 2").run();
  await request(app).get('/api/auth/me').set({ ...admin, 'X-Preview-Role': 'specialist' }).expect(404);
  db.prepare("UPDATE users SET role = 'admin' WHERE id = 4").run();
  await request(app).get('/api/auth/me').set({ ...admin, 'X-Preview-Role': 'child' }).expect(404);
  db.prepare("UPDATE users SET role = 'parent' WHERE email = ?").run(ADMIN_EMAIL);
  await request(app).get('/api/auth/me').set({ ...admin, 'X-Preview-Role': 'parent' }).expect(403);
});
