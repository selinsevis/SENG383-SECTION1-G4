const request = require('supertest');
const { openDatabase, seedDatabase, DEMO_PASSWORD } = require('../src/database');
const { createApp } = require('../src/app');
const { weekRange, isoWeek } = require('../src/weeks');
let db, app;
beforeEach(() => { db = openDatabase(':memory:'); seedDatabase(db); app = createApp(db, { jwtSecret: 'entry-tests' }); });
afterEach(() => db.close());
async function auth(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD }).expect(200);
  return { Authorization: `Bearer ${res.body.token}` };
}
const note = { year: 2026, week: 46, content: 'Sentetik haftalık değerlendirme: okuma etkinliğine katıldı.' };

test('parent creates a named child owned by the session; other parents and specialists cannot access it', async () => {
  const parent = await auth('parent@demo.test');
  const added = await request(app).post('/api/children').set(parent)
    .send({ firstName: '  Deniz  Ali ', lastName: ' Demo ', email: 'deniz@demo.test', password: DEMO_PASSWORD, parent_id: 999, user_id: 4 }).expect(201);
  expect(added.body.name).toBe('Deniz Ali Demo');
  const row = db.prepare('SELECT * FROM children WHERE id = ?').get(added.body.id);
  expect(row.parent_id).toBe(1); expect(row.user_id).not.toBe(4);
  expect(db.prepare('SELECT role FROM users WHERE id = ?').get(row.user_id).role).toBe('child');
  expect((await request(app).get('/api/children').set(parent)).body).toContainEqual(added.body);
  await request(app).get(`/api/children/${row.id}/entries`).set(await auth('teacher@demo.test')).expect(403);
  db.prepare("INSERT INTO users VALUES (50, 'Other', 'other@demo.test', 'hash', 'parent', NULL)").run();
  db.prepare("INSERT INTO children (id, parent_id, name) VALUES (100, 50, 'Other child')").run();
  await request(app).get('/api/children/100/entries').set(parent).expect(403);
});

test('child creation validates names and requires a parent', async () => {
  await request(app).post('/api/children').send({ firstName: 'Demo', lastName: 'Child' }).expect(401);
  for (const email of ['teacher@demo.test', 'child@demo.test']) {
    await request(app).post('/api/children').set(await auth(email)).send({ firstName: 'Demo', lastName: 'Child' }).expect(403);
  }
  const parent = await auth('parent@demo.test');
  for (const body of [{}, { firstName: ' ', lastName: 'Demo' }, { firstName: 'Demo', lastName: 123 },
    { firstName: 'a'.repeat(81), lastName: 'Demo' }, { firstName: 'Demo\nName', lastName: 'Child' }]) {
    await request(app).post('/api/children').set(parent).send(body).expect(400);
  }
});

test('specialist writes a weekly entry, parent reads it, and only its author can edit', async () => {
  const teacher = await auth('teacher@demo.test');
  const parent = await auth('parent@demo.test');
  const created = await request(app).post('/api/children/1/entries').set(teacher).send(note).expect(201);
  expect(created.body).toMatchObject({ childId: 1, specialistId: 2, entryDate: '2026-11-09', isEdited: 0, content: note.content });
  let list = await request(app).get('/api/children/1/entries?year=2026&week=46').set(parent).expect(200);
  expect(list.body.entries).toHaveLength(1);
  await request(app).post('/api/children/1/entries').set(teacher).send(note).expect(409);
  await request(app).put(`/api/entries/${created.body.id}`).set(parent).send({ content: 'forbidden' }).expect(403);
  await request(app).post('/api/children/1/specialists').set(parent)
    .send({ email: 'psychologist@demo.test', specialistType: 'psychologist' }).expect(201);
  const psychologist = await auth('psychologist@demo.test');
  await request(app).get('/api/children/1/entries?year=2026&week=46').set(psychologist).expect(200);
  await request(app).put(`/api/entries/${created.body.id}`).set(psychologist).send({ content: 'forbidden' }).expect(403);
  await request(app).post('/api/children/1/entries').set(psychologist).send(note).expect(201);
  const edited = await request(app).put(`/api/entries/${created.body.id}`).set(teacher).send({ content: 'Düzenlenmiş sentetik not.' }).expect(200);
  expect(edited.body).toMatchObject({ isEdited: 1, content: 'Düzenlenmiş sentetik not.' });
  list = await request(app).get('/api/children/1/entries?year=2026&week=46').set(parent).expect(200);
  expect(list.body.entries).toHaveLength(2);
});

test('child, unlinked specialist and unauthenticated users cannot read or write evaluations', async () => {
  await request(app).get('/api/children/1/entries').expect(401);
  for (const email of ['child@demo.test', 'psychologist@demo.test']) {
    const headers = await auth(email);
    await request(app).get('/api/children/1/entries').set(headers).expect(403);
    await request(app).post('/api/children/1/entries').set(headers).send(note).expect(403);
  }
  await request(app).post('/api/children/1/entries').set(await auth('parent@demo.test')).send(note).expect(403);
});

test('unlink immediately revokes read and edit, and seed does not restore that link', async () => {
  const teacher = await auth('teacher@demo.test');
  const created = await request(app).post('/api/children/1/entries').set(teacher).send(note).expect(201);
  await request(app).delete('/api/children/1/specialists/2').set(await auth('parent@demo.test')).expect(204);
  seedDatabase(db);
  await request(app).get('/api/children/1/entries').set(teacher).expect(403);
  await request(app).put(`/api/entries/${created.body.id}`).set(teacher).send({ content: 'Changed' }).expect(403);
});

test('filters respect ISO year boundaries and exclude other weeks and children', async () => {
  const teacher = await auth('teacher@demo.test');
  for (const [year, week] of [[2020, 53], [2021, 1], [2026, 46]]) {
    await request(app).post('/api/children/1/entries').set(teacher).send({ ...note, year, week }).expect(201);
  }
  const parent = await auth('parent@demo.test');
  const res = await request(app).get('/api/children/1/entries?year=2020&week=53').set(parent).expect(200);
  expect(res.body).toMatchObject({ start: '2020-12-28', end: '2021-01-04' });
  expect(res.body.entries).toHaveLength(1);
  await request(app).get('/api/children/1/entries?year=2026&week=45').set(parent).expect(200)
    .then((r) => expect(r.body.entries).toEqual([]));
  await request(app).get('/api/children/999/entries').set(parent).expect(404);
});

test('entry validation rejects invalid weeks/content and missing edit targets', async () => {
  const teacher = await auth('teacher@demo.test');
  for (const invalid of [{ week: 0 }, { week: 54 }, { year: 2021, week: 53 }, { year: 1999 },
    { year: [2026] }, { content: '' }, { content: ' ' }, { content: 1 }, { content: 'a'.repeat(10001) }]) {
    await request(app).post('/api/children/1/entries').set(teacher).send({ ...note, ...invalid }).expect(400);
  }
  const created = await request(app).post('/api/children/1/entries').set(teacher).send(note).expect(201);
  await request(app).put(`/api/entries/${created.body.id}`).set(teacher).send({ content: ' ' }).expect(400);
  await request(app).put('/api/entries/999').set(teacher).send({ content: 'Valid' }).expect(404);
  await request(app).get('/api/children/1/entries?year=2021&week=53').set(teacher).expect(400);
});

test('ISO weeks handle the first and last days of a year', () => {
  expect(isoWeek(new Date('2021-01-01T23:00:00Z'))).toEqual({ year: 2020, week: 53 });
  expect(weekRange(2026, 1)).toMatchObject({ start: '2025-12-29', end: '2026-01-05' });
  expect(weekRange(2021, 53)).toBeNull();
  expect(weekRange(2020, 53)).toMatchObject({ start: '2020-12-28' });
});
