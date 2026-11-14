const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// Resolve relative to this module so the same file is used from any working directory.
const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'development.sqlite');

// Synthetic demo accounts (M1). All of them use the same demo password.
// These are not real people; the assignment allows synthetic data only.
const DEMO_PASSWORD = 'Demo1234!';
const DEMO_USERS = [
  { id: 1, name: 'Ayşe Demo (Parent)', email: 'parent@demo.test', role: 'parent', specialistType: null },
  { id: 2, name: 'Mehmet Demo (Teacher)', email: 'teacher@demo.test', role: 'specialist', specialistType: 'teacher' },
  { id: 3, name: 'Zeynep Demo (Psychologist)', email: 'psychologist@demo.test', role: 'specialist', specialistType: 'psychologist' },
  { id: 4, name: 'Can Demo (Child)', email: 'child@demo.test', role: 'child', specialistType: null },
];

function openDatabase(filename = process.env.DB_PATH || DEFAULT_DB_PATH) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  return db;
}

function seedDatabase(db) {
  db.transaction(() => {
    db.exec(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done'))
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('parent', 'specialist', 'child')),
      specialist_type TEXT
    )`);
    // M2: a child belongs to one parent and has its own login account (user_id).
    db.exec(`CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY,
      parent_id INTEGER NOT NULL REFERENCES users(id),
      user_id INTEGER UNIQUE REFERENCES users(id),
      name TEXT NOT NULL
    )`);
    // M2: which specialists are linked to which child. Unlinking deletes the row.
    db.exec(`CREATE TABLE IF NOT EXISTS specialist_links (
      id INTEGER PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      specialist_id INTEGER NOT NULL REFERENCES users(id),
      specialist_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (child_id, specialist_id)
    )`);

    // Re-running seed must not duplicate rows or overwrite existing ones.
    db.prepare('INSERT OR IGNORE INTO tasks (id, title, status) VALUES (?, ?, ?)')
      .run(1, 'Read for 20 minutes', 'open');

    const insertUser = db.prepare(`INSERT OR IGNORE INTO users
      (id, name, email, password_hash, role, specialist_type) VALUES (?, ?, ?, ?, ?, ?)`);
    const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    for (const u of DEMO_USERS) {
      insertUser.run(u.id, u.name, u.email, passwordHash, u.role, u.specialistType);
    }

    // One synthetic child (the parent's child, with the child login), linked to the teacher.
    // The psychologist is registered but not linked, so linking can be shown in the demo.
    db.prepare('INSERT OR IGNORE INTO children (id, parent_id, user_id, name) VALUES (?, ?, ?, ?)')
      .run(1, 1, 4, 'Can Demo');
    db.prepare(`INSERT OR IGNORE INTO specialist_links (child_id, specialist_id, specialist_type)
      VALUES (?, ?, ?)`).run(1, 2, 'teacher');
  })();
}

module.exports = { openDatabase, seedDatabase, DEMO_USERS, DEMO_PASSWORD };
