const path = require('node:path');
const { openDatabase } = require('./database');
const { createApp } = require('./app');

// Load server/.env if it exists (JWT_SECRET, later AI settings). .env is ignored by Git.
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // No .env file: fall back to the defaults below.
}

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  // Local development only. Copy .env.example to .env and set your own secret.
  jwtSecret = 'local-development-secret';
  console.warn('JWT_SECRET is not set; using a development-only secret. See server/.env.example.');
}

const db = openDatabase();
try {
  db.prepare('SELECT id FROM tasks LIMIT 1').get();
  db.prepare('SELECT id FROM users LIMIT 1').get();
} catch (err) {
  console.error('Database is not ready. Run "npm run seed" before "npm start".');
  db.close();
  process.exit(1);
}

const server = createApp(db, { jwtSecret }).listen(3000, 'localhost', () => {
  console.log('Backend running at http://localhost:3000');
});

server.on('error', (err) => {
  console.error('Could not start backend:', err.message);
  db.close();
  process.exitCode = 1;
});

function shutdown() {
  server.close(() => db.close());
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
