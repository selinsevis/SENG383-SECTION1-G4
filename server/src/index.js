const { openDatabase } = require('./database');
const { createApp } = require('./app');

const db = openDatabase();
try {
  db.prepare('SELECT id, title, status FROM tasks LIMIT 1').get();
} catch (err) {
  console.error('Database is not ready. Run "npm run seed" before "npm start".');
  db.close();
  process.exit(1);
}

const server = createApp(db).listen(3000, 'localhost', () => {
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
