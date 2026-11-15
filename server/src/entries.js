const express = require('express');
const { requireRole } = require('./auth');
const { isoWeek, weekRange } = require('./weeks');

function getEntry(db, id) {
  return db.prepare(`SELECT e.id, e.child_id AS childId, e.specialist_id AS specialistId,
    u.name AS specialistName, e.entry_date AS entryDate, e.content,
    e.is_edited AS isEdited, e.created_at AS createdAt, e.updated_at AS updatedAt
    FROM entries e JOIN users u ON u.id = e.specialist_id WHERE e.id = ?`).get(id);
}

const validContent = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 10000;

function createChildEntriesRouter(db) {
  const router = express.Router();
  // Parent router has already checked role and current child access.
  router.get('/', (req, res) => {
    const current = isoWeek();
    const range = weekRange(req.query.year ?? current.year, req.query.week ?? current.week);
    if (!range) return res.status(400).json({ error: 'Geçerli bir ISO yıl ve hafta seçin (2000–2100).' });
    const ids = db.prepare(`SELECT id FROM entries WHERE child_id = ? AND entry_date >= ? AND entry_date < ?
      ORDER BY created_at DESC, id DESC`).all(req.child.id, range.start, range.end);
    res.set('Cache-Control', 'no-store');
    res.json({ ...range, entries: ids.map(({ id }) => getEntry(db, id)) });
  });

  router.post('/', requireRole('specialist'), (req, res) => {
    const { year, week, content } = req.body || {};
    const range = weekRange(year, week);
    if (!range || !validContent(content)) {
      return res.status(400).json({ error: 'Geçerli yıl/hafta ve 1–10000 karakterlik değerlendirme gereklidir.' });
    }
    const existing = db.prepare('SELECT id FROM entries WHERE child_id = ? AND specialist_id = ? AND entry_date = ?')
      .get(req.child.id, req.user.id, range.start);
    if (existing) return res.status(409).json({ error: 'Bu hafta için değerlendirmeniz var. Mevcut değerlendirmeyi düzenleyin.' });
    const result = db.prepare('INSERT INTO entries (child_id, specialist_id, entry_date, content) VALUES (?, ?, ?, ?)')
      .run(req.child.id, req.user.id, range.start, content.trim());
    res.status(201).json(getEntry(db, result.lastInsertRowid));
  });
  return router;
}

function createEntriesRouter(db, accessChild) {
  const router = express.Router();
  router.put('/:entryId', requireRole('specialist'), (req, res, next) => {
    const entryId = Number(req.params.entryId);
    const entry = Number.isSafeInteger(entryId) ? getEntry(db, entryId) : null;
    if (!entry) return res.status(404).json({ error: 'Değerlendirme bulunamadı.' });
    if (entry.specialistId !== req.user.id) return res.status(403).json({ error: 'Yalnızca kendi değerlendirmenizi düzenleyebilirsiniz.' });
    req.params.childId = String(entry.childId);
    req.entry = entry;
    accessChild(req, res, next);
  }, (req, res) => {
    const { content } = req.body || {};
    if (!validContent(content)) return res.status(400).json({ error: 'Değerlendirme 1–10000 karakter olmalıdır.' });
    db.prepare("UPDATE entries SET content = ?, is_edited = 1, updated_at = datetime('now') WHERE id = ?")
      .run(content.trim(), req.entry.id);
    res.json(getEntry(db, req.entry.id));
  });
  return router;
}

module.exports = { createChildEntriesRouter, createEntriesRouter };
