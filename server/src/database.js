const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

// Resolve relative to this module so the same file is used from any working directory.
const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'development.sqlite');

function openDatabase(filename = process.env.DB_PATH || DEFAULT_DB_PATH) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  return new Database(filename);
}

function seedDatabase(db) {
  db.transaction(() => {
    db.exec(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done'))
    )`);
    // Re-running seed must not duplicate tasks or overwrite an existing task.
    db.prepare('INSERT OR IGNORE INTO tasks (id, title, status) VALUES (?, ?, ?)')
      .run(1, 'Read for 20 minutes', 'open');
  })();
}

module.exports = { openDatabase, seedDatabase };
