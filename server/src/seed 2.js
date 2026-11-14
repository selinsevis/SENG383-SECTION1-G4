const { openDatabase, seedDatabase } = require('./database');

const db = openDatabase();
try {
  seedDatabase(db);
  console.log('SQLite ready: sample task seeded.');
} finally {
  db.close();
}
