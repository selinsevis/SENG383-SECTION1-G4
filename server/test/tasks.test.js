const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { openDatabase, seedDatabase } = require('../src/database');
const { createApp } = require('../src/app');

let directory;
let db;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g4-skeleton-'));
  db = openDatabase(path.join(directory, 'data', 'test.sqlite'));
  seedDatabase(db);
});
afterEach(() => {
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

test('seed persists a sample task and the API returns the frontend contract', async () => {
  db.close();
  db = openDatabase(path.join(directory, 'data', 'test.sqlite'));
  const res = await request(createApp(db, { jwtSecret: 'test-secret' })).get('/api/tasks').expect(200)
    .expect('Content-Type', /json/);
  expect(res.body).toEqual([{ id: 1, title: 'Read for 20 minutes', status: 'open' }]);
});

test('repeated seed preserves existing tasks and does not duplicate the sample', () => {
  db.prepare("UPDATE tasks SET status = 'done' WHERE id = 1").run();
  db.prepare('INSERT INTO tasks VALUES (?, ?, ?)').run(2, 'Synthetic second task', 'open');
  seedDatabase(db);
  expect(db.prepare('SELECT * FROM tasks ORDER BY id').all()).toEqual([
    { id: 1, title: 'Read for 20 minutes', status: 'done' },
    { id: 2, title: 'Synthetic second task', status: 'open' },
  ]);
});

test('API reads current database contents, including the empty state', async () => {
  db.prepare('DELETE FROM tasks').run();
  await request(createApp(db, { jwtSecret: 'test-secret' })).get('/api/tasks').expect(200, []);
  db.prepare('INSERT INTO tasks VALUES (?, ?, ?)').run(7, 'Another synthetic task', 'done');
  await request(createApp(db, { jwtSecret: 'test-secret' })).get('/api/tasks').expect(200, [
    { id: 7, title: 'Another synthetic task', status: 'done' },
  ]);
});

test('unknown routes return JSON 404', async () => {
  await request(createApp(db, { jwtSecret: 'test-secret' })).get('/api/missing').expect(404, { error: 'Not found' });
});

test('database failures return a generic JSON error without leaking SQL', async () => {
  db.exec('DROP TABLE tasks');
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await request(createApp(db, { jwtSecret: 'test-secret' })).get('/api/tasks')
      .expect(500, { error: 'Internal server error' });
  } finally {
    log.mockRestore();
  }
});
