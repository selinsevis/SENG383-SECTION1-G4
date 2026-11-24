const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// Resolve relative to this module so the same file is used from any working directory.
const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'development.sqlite');

// Synthetic demo accounts (M1). All of them use the same demo password.
// These are not real people; the assignment allows synthetic data only.
const DEMO_PASSWORD = 'Demo1234!';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin';
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

function seedDatabase(db, { uploadsDir } = {}) {
  migrateAdminRole(db);
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
      role TEXT NOT NULL CHECK (role IN ('parent', 'specialist', 'child', 'admin')),
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
    db.exec(`CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      specialist_id INTEGER NOT NULL REFERENCES users(id),
      entry_date TEXT NOT NULL,
      content TEXT NOT NULL,
      is_edited INTEGER NOT NULL DEFAULT 0 CHECK (is_edited IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT,
      UNIQUE(child_id, specialist_id, entry_date)
    )`);
    const columns = new Set(db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name));
    for (const [name, definition] of Object.entries({
      child_id: 'INTEGER REFERENCES children(id)', assigned_by: 'INTEGER REFERENCES users(id)',
      description: "TEXT NOT NULL DEFAULT ''", area: "TEXT NOT NULL DEFAULT 'language' CHECK (area IN ('language','motor','social','cognitive','self_care'))",
      due_date: 'TEXT', completed_at: 'TEXT',
    })) {
      if (!columns.has(name)) db.exec(`ALTER TABLE tasks ADD COLUMN ${name} ${definition}`);
    }
    db.exec(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      created_by INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT);
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        uploaded_by INTEGER NOT NULL REFERENCES users(id), file_name TEXT NOT NULL,
        stored_name TEXT NOT NULL UNIQUE, file_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
        uploaded_at TEXT NOT NULL DEFAULT (datetime('now')), file_data BLOB);
      CREATE TABLE IF NOT EXISTS ai_summaries (
        id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        created_by INTEGER NOT NULL REFERENCES users(id), reader_role TEXT NOT NULL,
        week_start TEXT NOT NULL, content TEXT NOT NULL, mode TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS ai_summary_sources (
        id INTEGER PRIMARY KEY, summary_id INTEGER NOT NULL REFERENCES ai_summaries(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL, source_id INTEGER NOT NULL, snapshot TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ai_feedback (
        summary_id INTEGER NOT NULL REFERENCES ai_summaries(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id), feedback TEXT NOT NULL CHECK (feedback IN ('helpful','incorrect')),
        PRIMARY KEY(summary_id, user_id));`);
    if (!db.prepare('PRAGMA table_info(documents)').all().some((c) => c.name === 'file_data')) {
      db.exec('ALTER TABLE documents ADD COLUMN file_data BLOB');
    }

    // Re-running seed must not duplicate rows or overwrite existing ones.
    db.prepare('INSERT OR IGNORE INTO tasks (id, title, status) VALUES (?, ?, ?)')
      .run(1, 'Read for 20 minutes', 'open');

    const insertUser = db.prepare(`INSERT OR IGNORE INTO users
      (id, name, email, password_hash, role, specialist_type) VALUES (?, ?, ?, ?, ?, ?)`);
    const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    for (const u of DEMO_USERS) {
      insertUser.run(u.id, u.name, u.email, passwordHash, u.role, u.specialistType);
    }

    // Separate local operations account. Existing accounts/passwords are never reset.
    const existingAdmin = db.prepare('SELECT role FROM users WHERE email = ?').get(ADMIN_EMAIL);
    if (existingAdmin && existingAdmin.role !== 'admin') {
      throw new Error('Admin email is already used by a non-admin account');
    }
    if (!existingAdmin) {
      db.prepare(`INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, 'admin')`)
        .run('Development Admin', ADMIN_EMAIL, bcrypt.hashSync(ADMIN_PASSWORD, 10));
    }

    // One synthetic child (the parent's child, with the child login), linked to the teacher.
    // The psychologist is registered but not linked, so linking can be shown in the demo.
    const createdChild = db.prepare('INSERT OR IGNORE INTO children (id, parent_id, user_id, name) VALUES (?, ?, ?, ?)')
      .run(1, 1, 4, 'Can Demo');
    if (createdChild.changes) {
      db.prepare(`INSERT OR IGNORE INTO specialist_links (child_id, specialist_id, specialist_type)
        VALUES (?, ?, ?)`).run(1, 2, 'teacher');
    }
    const { isoWeek, weekRange } = require('./weeks');
    const current = isoWeek();
    const week = weekRange(current.year, current.week);
    // Upgrade synthetic skeleton rows in place, preserving IDs, titles and statuses.
    db.prepare(`UPDATE tasks SET child_id = COALESCE(child_id, 1), assigned_by = COALESCE(assigned_by, 2),
      due_date = COALESCE(due_date, ?)`).run(week.start);
    db.prepare(`INSERT OR IGNORE INTO events (id, child_id, created_by, title, starts_at, ends_at)
      VALUES (1, 1, 2, 'Haftalık okuma saati', ?, ?)`).run(`${week.start}T10:00`, `${week.start}T10:30`);
  })();
  require('./documentStorage').migrateLegacyDocuments(db, uploadsDir);
}

// SQLite cannot ALTER a CHECK constraint. Rebuild only the users table while
// preserving rows, custom indexes/triggers, and references from child/link tables.
function migrateAdminRole(db) {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (!table || /'admin'/.test(table.sql)) return;
  if (db.inTransaction) throw new Error('Run user migration outside a transaction');
  const sql = table.sql.replace(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`]?users["`]?/i, 'CREATE TABLE users_admin_migration')
    .replace(/CHECK\s*\(\s*role\s+IN\s*\(\s*'parent'\s*,\s*'specialist'\s*,\s*'child'\s*\)\s*\)/i,
      "CHECK (role IN ('parent', 'specialist', 'child', 'admin'))");
  if (!sql.includes("'admin'")) throw new Error('Unrecognized users schema; migration cancelled');
  const objects = db.prepare(`SELECT sql FROM sqlite_master WHERE tbl_name = 'users'
    AND type IN ('index', 'trigger') AND sql IS NOT NULL`).all();
  const foreignKeys = db.pragma('foreign_keys', { simple: true });
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.exec(sql);
      db.exec(`INSERT INTO users_admin_migration SELECT * FROM users;
        DROP TABLE users;
        ALTER TABLE users_admin_migration RENAME TO users;`);
      for (const object of objects) db.exec(object.sql);
      if (db.pragma('foreign_key_check').length) throw new Error('Migration would break foreign keys');
    })();
  } finally {
    db.pragma(`foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
  }
}

module.exports = { openDatabase, seedDatabase, migrateAdminRole, DEMO_USERS, DEMO_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD };
