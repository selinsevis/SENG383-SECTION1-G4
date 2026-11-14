const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { openDatabase, seedDatabase, DEMO_PASSWORD } = require('../src/database');
const { createApp } = require('../src/app');
const { authenticate, requireRole } = require('../src/auth');

const SECRET = 'test-secret';
let directory;
let db;
let app;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g4-auth-'));
  db = openDatabase(path.join(directory, 'test.sqlite'));
  seedDatabase(db);
  app = createApp(db, { jwtSecret: SECRET });
});
afterEach(() => {
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

function login(email, password = DEMO_PASSWORD) {
  return request(app).post('/api/auth/login').send({ email, password });
}

describe('POST /api/auth/login', () => {
  test('FR-M1-01 / FR-M1-03: valid login returns a token and the role from the account', async () => {
    const res = await login('teacher@demo.test').expect(200);
    expect(res.body.user).toEqual({
      id: 2, name: 'Mehmet Demo (Teacher)', email: 'teacher@demo.test', role: 'specialist',
    });
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(jwt.verify(res.body.token, SECRET)).toMatchObject({ sub: 2, role: 'specialist' });
  });

  test('email is matched without case and surrounding spaces', async () => {
    const res = await login('  PARENT@demo.test ').expect(200);
    expect(res.body.user.role).toBe('parent');
  });

  test('FR-M1-02: wrong password and unknown email get the same 401 message', async () => {
    const wrongPassword = await login('parent@demo.test', 'wrong').expect(401);
    const unknownEmail = await login('nobody@demo.test').expect(401);
    expect(wrongPassword.body).toEqual({ error: 'Invalid email or password' });
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  test('missing fields return 400', async () => {
    await request(app).post('/api/auth/login').send({ email: 'parent@demo.test' })
      .expect(400, { error: 'Email and password are required' });
    await request(app).post('/api/auth/login').send({ email: 123, password: [] }).expect(400);
  });

  test('a body that is not valid JSON returns 400, not 500', async () => {
    await request(app).post('/api/auth/login')
      .set('Content-Type', 'application/json').send('{not json')
      .expect(400, { error: 'Request body must be valid JSON' });
  });
});

describe('GET /api/auth/me', () => {
  test('returns the logged-in user for a valid token', async () => {
    const { body } = await login('child@demo.test');
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${body.token}`).expect(200);
    expect(res.body.user).toMatchObject({ id: 4, role: 'child' });
  });

  test('FR-M1-05: missing, malformed, wrongly signed and expired tokens get 401', async () => {
    await request(app).get('/api/auth/me').expect(401, { error: 'Login required' });
    await request(app).get('/api/auth/me').set('Authorization', 'Token abc').expect(401);
    const forged = jwt.sign({ sub: 1, role: 'parent' }, 'another-secret');
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);
    const expired = jwt.sign({ sub: 1, role: 'parent' }, SECRET, { expiresIn: -10 });
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`)
      .expect(401, { error: 'Invalid or expired token' });
  });

  test('a token for a deleted user is rejected', async () => {
    const { body } = await login('psychologist@demo.test');
    db.prepare('DELETE FROM users WHERE id = 3').run();
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`).expect(401);
  });
});

describe('requireRole middleware', () => {
  // A small test-only app with one route that only parents may use.
  function parentOnlyApp() {
    const testApp = express();
    testApp.get('/parent-only', authenticate(db, SECRET), requireRole('parent'),
      (req, res) => res.json({ ok: true }));
    return testApp;
  }

  test('FR-M1-04: allows the listed role and rejects others with 403', async () => {
    const parent = (await login('parent@demo.test')).body.token;
    const child = (await login('child@demo.test')).body.token;
    await request(parentOnlyApp()).get('/parent-only')
      .set('Authorization', `Bearer ${parent}`).expect(200, { ok: true });
    await request(parentOnlyApp()).get('/parent-only')
      .set('Authorization', `Bearer ${child}`).expect(403);
  });
});

test('seed is repeatable and stores only password hashes', () => {
  seedDatabase(db);
  const users = db.prepare('SELECT email, password_hash FROM users ORDER BY id').all();
  expect(users).toHaveLength(4);
  for (const u of users) expect(u.password_hash).not.toBe(DEMO_PASSWORD);
});
