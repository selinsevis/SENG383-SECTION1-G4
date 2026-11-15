const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const request = require('supertest');
const { openDatabase, seedDatabase, DEMO_PASSWORD } = require('../src/database');
const { createApp } = require('../src/app');
const { authenticate } = require('../src/auth');
const { canAccessChild } = require('../src/children');

const SECRET = 'test-secret';
let directory;
let db;
let app;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g4-children-'));
  db = openDatabase(path.join(directory, 'test.sqlite'));
  seedDatabase(db);
  app = createApp(db, { jwtSecret: SECRET });
});
afterEach(() => {
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

async function tokenFor(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
  return res.body.token;
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('GET /api/children', () => {
  test('each role sees only the children it may see', async () => {
    const parent = await request(app).get('/api/children').set(auth(await tokenFor('parent@demo.test')));
    expect(parent.body).toEqual([{ id: 1, name: 'Can Demo' }]);

    // FR-M2-06: the linked teacher sees the child; the unlinked psychologist sees none.
    const teacher = await request(app).get('/api/children').set(auth(await tokenFor('teacher@demo.test')));
    expect(teacher.body).toEqual([{ id: 1, name: 'Can Demo', specialistType: 'teacher' }]);
    const psychologist = await request(app).get('/api/children')
      .set(auth(await tokenFor('psychologist@demo.test')));
    expect(psychologist.body).toEqual([]);

    const child = await request(app).get('/api/children').set(auth(await tokenFor('child@demo.test')));
    expect(child.body).toEqual([{ id: 1, name: 'Can Demo' }]);
  });

  test('requires login', async () => {
    await request(app).get('/api/children').expect(401);
  });
});

describe('GET /api/children/:childId/specialists', () => {
  test('FR-M2-03: parent and linked specialist see the list', async () => {
    const expected = [expect.objectContaining({ id: 2, email: 'teacher@demo.test', specialistType: 'teacher' })];
    const parent = await request(app).get('/api/children/1/specialists')
      .set(auth(await tokenFor('parent@demo.test'))).expect(200);
    expect(parent.body).toEqual(expected);
    const teacher = await request(app).get('/api/children/1/specialists')
      .set(auth(await tokenFor('teacher@demo.test'))).expect(200);
    expect(teacher.body).toEqual(expected);
  });

  test('unlinked specialist gets 403, child gets 403, unknown child gets 404', async () => {
    await request(app).get('/api/children/1/specialists')
      .set(auth(await tokenFor('psychologist@demo.test'))).expect(403);
    await request(app).get('/api/children/1/specialists')
      .set(auth(await tokenFor('child@demo.test'))).expect(403);
    await request(app).get('/api/children/99/specialists')
      .set(auth(await tokenFor('parent@demo.test'))).expect(404);
  });
});

describe('POST /api/children/:childId/specialists', () => {
  test('FR-M2-01: parent links a registered specialist by email and type', async () => {
    const res = await request(app).post('/api/children/1/specialists')
      .set(auth(await tokenFor('parent@demo.test')))
      .send({ email: ' Psychologist@demo.test ', specialistType: 'psychologist' })
      .expect(201);
    expect(res.body.map((s) => s.id).sort()).toEqual([2, 3]);

    // The newly linked psychologist can now see the child.
    await request(app).get('/api/children/1/specialists')
      .set(auth(await tokenFor('psychologist@demo.test'))).expect(200);
  });

  test('FR-M2-02: unregistered email and a non-specialist account get 404', async () => {
    const token = await tokenFor('parent@demo.test');
    await request(app).post('/api/children/1/specialists').set(auth(token))
      .send({ email: 'nobody@demo.test', specialistType: 'teacher' })
      .expect(404, { error: 'No registered specialist with this email' });
    await request(app).post('/api/children/1/specialists').set(auth(token))
      .send({ email: 'child@demo.test', specialistType: 'teacher' }).expect(404);
  });

  test('invalid input, duplicate link and non-parent callers are rejected', async () => {
    const parent = await tokenFor('parent@demo.test');
    await request(app).post('/api/children/1/specialists').set(auth(parent))
      .send({ specialistType: 'teacher' }).expect(400);
    await request(app).post('/api/children/1/specialists').set(auth(parent))
      .send({ email: 'psychologist@demo.test', specialistType: 'wizard' }).expect(400);
    await request(app).post('/api/children/1/specialists').set(auth(parent))
      .send({ email: 'teacher@demo.test', specialistType: 'teacher' }).expect(409);
    await request(app).post('/api/children/1/specialists').set(auth(await tokenFor('teacher@demo.test')))
      .send({ email: 'psychologist@demo.test', specialistType: 'psychologist' }).expect(403);
  });

  test('a parent cannot link specialists to another parent\'s child', async () => {
    db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (50, 'Other', 'other@demo.test', 'x', 'parent')").run();
    db.prepare("INSERT INTO children (id, parent_id, name) VALUES (2, 50, 'Other child')").run();
    await request(app).post('/api/children/2/specialists').set(auth(await tokenFor('parent@demo.test')))
      .send({ email: 'psychologist@demo.test', specialistType: 'psychologist' }).expect(403);
  });
});

describe('DELETE /api/children/:childId/specialists/:specialistId', () => {
  test('FR-M2-04 / FR-M2-05: after unlinking, the specialist is blocked even with a valid token', async () => {
    const teacher = await tokenFor('teacher@demo.test');
    await request(app).get('/api/children/1/specialists').set(auth(teacher)).expect(200);

    await request(app).delete('/api/children/1/specialists/2')
      .set(auth(await tokenFor('parent@demo.test'))).expect(204);

    // Same token as before: still valid, but the link is gone.
    await request(app).get('/api/children/1/specialists').set(auth(teacher))
      .expect(403, { error: 'You do not have access to this child' });
    const list = await request(app).get('/api/children').set(auth(teacher));
    expect(list.body).toEqual([]);
  });

  test('unlinking a specialist who is not linked returns 404; only the parent may unlink', async () => {
    await request(app).delete('/api/children/1/specialists/3')
      .set(auth(await tokenFor('parent@demo.test'))).expect(404);
    await request(app).delete('/api/children/1/specialists/2')
      .set(auth(await tokenFor('teacher@demo.test'))).expect(403);
  });
});

test('canAccessChild can protect any child route (used by M3–M8)', async () => {
  const testApp = express();
  testApp.get('/children/:childId/anything', authenticate(db, SECRET), canAccessChild(db),
    (req, res) => res.json({ child: req.child.name }));
  await request(testApp).get('/children/1/anything')
    .set(auth(await tokenFor('teacher@demo.test'))).expect(200, { child: 'Can Demo' });
  await request(testApp).get('/children/1/anything')
    .set(auth(await tokenFor('psychologist@demo.test'))).expect(403);
  await request(testApp).get('/children/abc/anything')
    .set(auth(await tokenFor('parent@demo.test'))).expect(404);
});

describe('parent provisions a child login', () => {
  const details = { firstName: 'Deniz', lastName: 'Demo', email: ' Deniz@demo.test ', password: 'ChildDemo123!' };
  test('creates a hashed child account that logs in and sees only its own profile', async () => {
    const parent = await tokenFor('parent@demo.test');
    const created = await request(app).post('/api/children').set(auth(parent))
      .send({ ...details, role: 'admin', parent_id: 999, user_id: 4 }).expect(201);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('deniz@demo.test');
    expect(user.role).toBe('child');
    expect(user.password_hash).not.toBe(details.password);
    expect(require('bcryptjs').compareSync(details.password, user.password_hash)).toBe(true);
    const login = await request(app).post('/api/auth/login')
      .send({ email: 'DENIZ@demo.test', password: details.password }).expect(200);
    expect(login.body.user.role).toBe('child');
    expect(JSON.stringify(created.body)).not.toContain('password');
    const headers = auth(login.body.token);
    expect((await request(app).get('/api/children').set(headers)).body).toEqual([created.body]);
    await request(app).get('/api/children/1/tasks').set(headers).expect(403);
    await request(app).get(`/api/children/${created.body.id}/documents`).set(headers).expect(403);
    await request(app).get(`/api/children/${created.body.id}/entries`).set(headers).expect(403);
    await request(app).post('/api/auth/login').send({ email: 'deniz@demo.test', password: 'wrong' }).expect(401);
  });
  test('rejects invalid credentials and duplicate accounts without creating profiles', async () => {
    const parent = auth(await tokenFor('parent@demo.test'));
    const users = db.prepare('SELECT count(*) AS n FROM users').get().n;
    const children = db.prepare('SELECT count(*) AS n FROM children').get().n;
    for (const patch of [{ email: undefined }, { email: 'invalid' }, { password: undefined },
      { password: 'short' }, { password: ' '.repeat(8) }, { password: 'ü'.repeat(37) }]) {
      await request(app).post('/api/children').set(parent).send({ ...details, ...patch }).expect(400);
    }
    for (const email of [' PARENT@DEMO.TEST ', 'teacher@demo.test', 'child@demo.test']) {
      await request(app).post('/api/children').set(parent).send({ ...details, email }).expect(409);
    }
    expect(db.prepare('SELECT count(*) AS n FROM users').get().n).toBe(users);
    expect(db.prepare('SELECT count(*) AS n FROM children').get().n).toBe(children);
  });
  test('rolls back the login account if profile insertion fails', async () => {
    db.exec("CREATE TRIGGER fail_child BEFORE INSERT ON children BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    await request(app).post('/api/children').set(auth(await tokenFor('parent@demo.test'))).send(details).expect(500);
    expect(db.prepare("SELECT id FROM users WHERE email = 'deniz@demo.test'").get()).toBeUndefined();
  });
});
