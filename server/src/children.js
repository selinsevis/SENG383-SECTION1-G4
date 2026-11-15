const express = require('express');
const bcrypt = require('bcryptjs');
const { requireRole } = require('./auth');
const { createChildEntriesRouter } = require('./entries');
const { childTasks } = require('./tasks');
const { eventsRouter } = require('./events');
const { statsRouter } = require('./stats');
const { summariesRouter } = require('./summaries');
const { childDocuments } = require('./documents');

// Specialist types a parent can choose when linking (assignment 3.1).
const SPECIALIST_TYPES = ['teacher', 'psychologist', 'doctor', 'special_education_teacher', 'coach'];

// Can this user see this child? This is the access rule of the whole system (FR-M2-05).
// - parent:     only their own child
// - specialist: only a child they are linked to RIGHT NOW (read from the database on every
//               request, so unlinking works at once even if the specialist's token is still valid)
// - child:      only themselves
function userCanAccessChild(db, user, child) {
  if (user.role === 'admin') return true;
  if (user.role === 'parent') return child.parent_id === user.id;
  if (user.role === 'child') return child.user_id === user.id;
  if (user.role === 'specialist') {
    const link = db.prepare('SELECT 1 FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
      .get(child.id, user.id);
    return Boolean(link);
  }
  return false;
}

// Middleware for every route with :childId. Use it after authenticate.
// It puts the child on req.child, or answers 404 (no such child) / 403 (no access).
// M3–M8 routes reuse this, so the rule lives in one place.
function canAccessChild(db) {
  return (req, res, next) => {
    const childId = Number(req.params.childId);
    const child = Number.isInteger(childId)
      ? db.prepare('SELECT * FROM children WHERE id = ?').get(childId)
      : undefined;
    if (!child) return res.status(404).json({ error: 'Child not found' });
    if (!userCanAccessChild(db, req.user, child)) {
      return res.status(403).json({ error: 'You do not have access to this child' });
    }
    req.child = child;
    next();
  };
}

function listSpecialists(db, childId) {
  return db.prepare(`SELECT u.id, u.name, u.email, l.specialist_type AS specialistType, l.created_at AS linkedAt
    FROM specialist_links l JOIN users u ON u.id = l.specialist_id
    WHERE l.child_id = ? ORDER BY u.name`).all(childId);
}

// All routes here expect authenticate to have run before them.
function createChildrenRouter(db) {
  const router = express.Router();
  const access = canAccessChild(db);
  router.use('/:childId/tasks', access, childTasks(db));
  router.use('/:childId/events', access, eventsRouter(db));
  router.use('/:childId/stats', requireRole('parent', 'specialist', 'admin'), access, statsRouter(db));
  router.use('/:childId/summary', requireRole('parent', 'specialist'), access, summariesRouter(db));
  router.use('/:childId/summaries', requireRole('parent', 'specialist'), access, summariesRouter(db));
  router.use('/:childId/documents', requireRole('parent', 'specialist', 'admin'), access, childDocuments(db));

  router.post('/', requireRole('parent'), (req, res) => {
    const { firstName, lastName, email, password } = req.body || {};
    const validName = (value) => typeof value === 'string' && value.trim().length > 0
      && value.trim().length <= 80 && !/[\u0000-\u001f\u007f]/.test(value);
    if (!validName(firstName) || !validName(lastName)) {
      return res.status(400).json({ error: 'Ad ve soyad gereklidir; her biri en fazla 80 karakter olmalıdır.' });
    }
    const name = `${firstName.trim().replace(/\s+/g, ' ')} ${lastName.trim().replace(/\s+/g, ' ')}`;
    if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Geçerli bir çocuk e-posta adresi girin.' });
    }
    // bcrypt uses at most 72 bytes; reject longer inputs rather than silently truncating.
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72 || !password.trim()) {
      return res.status(400).json({ error: 'Şifre en az 8 karakter, en fazla 72 UTF-8 baytı olmalıdır.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = bcrypt.hashSync(password, 10);
    try {
      const child = db.transaction(() => {
        if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ?').get(normalizedEmail)) {
          throw Object.assign(new Error('Bu e-posta adresi zaten kullanılıyor.'), { status: 409 });
        }
        const user = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'child')")
          .run(name, normalizedEmail, passwordHash);
        // Ownership and role come from the session/server, never client-supplied IDs.
        const result = db.prepare('INSERT INTO children (parent_id, user_id, name) VALUES (?, ?, ?)')
          .run(req.user.id, Number(user.lastInsertRowid), name);
        return { id: Number(result.lastInsertRowid), name };
      })();
      res.status(201).json(child);
    } catch (error) {
      if (error.status === 409) return res.status(409).json({ error: error.message });
      throw error;
    }
  });

  router.use('/:childId/entries', requireRole('parent', 'specialist', 'admin'), access,
    createChildEntriesRouter(db));

  // Children the logged-in user may see (FR-M2-06 for specialists).
  router.get('/', (req, res) => {
    const { role, id } = req.user;
    let rows;
    if (role === 'admin') {
      rows = db.prepare('SELECT id, name FROM children ORDER BY name').all();
    } else if (role === 'parent') {
      rows = db.prepare('SELECT id, name FROM children WHERE parent_id = ? ORDER BY name').all(id);
    } else if (role === 'specialist') {
      rows = db.prepare(`SELECT c.id, c.name, l.specialist_type AS specialistType FROM children c
        JOIN specialist_links l ON l.child_id = c.id WHERE l.specialist_id = ? ORDER BY c.name`).all(id);
    } else {
      rows = db.prepare('SELECT id, name FROM children WHERE user_id = ?').all(id);
    }
    res.json(rows);
  });

  // FR-M2-03: list the specialists linked to the child.
  router.get('/:childId/specialists', requireRole('parent', 'specialist', 'admin'), access, (req, res) => {
    res.json(listSpecialists(db, req.child.id));
  });

  // FR-M2-01, FR-M2-02: the parent links a registered specialist by email and type.
  router.post('/:childId/specialists', requireRole('parent', 'admin'), access, (req, res) => {
    const { email, specialistType } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!SPECIALIST_TYPES.includes(specialistType)) {
      return res.status(400).json({ error: `Specialist type must be one of: ${SPECIALIST_TYPES.join(', ')}` });
    }

    const specialist = db.prepare("SELECT id FROM users WHERE email = ? AND role = 'specialist'")
      .get(email.trim().toLowerCase());
    if (!specialist) {
      return res.status(404).json({ error: 'No registered specialist with this email' });
    }

    const result = db.prepare(`INSERT OR IGNORE INTO specialist_links (child_id, specialist_id, specialist_type)
      VALUES (?, ?, ?)`).run(req.child.id, specialist.id, specialistType);
    if (result.changes === 0) {
      return res.status(409).json({ error: 'This specialist is already linked to the child' });
    }
    res.status(201).json(listSpecialists(db, req.child.id));
  });

  // FR-M2-04: the parent unlinks a specialist (the confirmation step is in the UI).
  router.delete('/:childId/specialists/:specialistId', requireRole('parent', 'admin'), access, (req, res) => {
    const result = db.prepare('DELETE FROM specialist_links WHERE child_id = ? AND specialist_id = ?')
      .run(req.child.id, Number(req.params.specialistId));
    if (result.changes === 0) {
      return res.status(404).json({ error: 'This specialist is not linked to the child' });
    }
    res.status(204).end();
  });

  return router;
}

module.exports = { createChildrenRouter, canAccessChild, SPECIALIST_TYPES };
