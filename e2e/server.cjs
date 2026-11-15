const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDatabase, seedDatabase } = require('../server/src/database');
const { createApp } = require('../server/src/app');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'g4-e2e-'));
const db = openDatabase(path.join(temp, 'test.sqlite'));
seedDatabase(db);
const server = createApp(db, { jwtSecret: 'e2e-only-secret' })
  .listen(3100, 'localhost', () => console.log('Isolated E2E API ready on 3100'));
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => {
  db.close(); fs.rmSync(temp, { recursive: true, force: true }); process.exit(0);
}));
