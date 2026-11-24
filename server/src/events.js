const express = require('express');
const { requireRole } = require('./auth');
const { range, dateTime, text } = require('./validation');
function eventsRouter(db) {
  const router = express.Router();
  router.get('/', (req, res) => {
    let week;
    if (req.query.month !== undefined) {
      const { year, month } = req.query;
      if (!/^\d{4}$/.test(String(year)) || !/^\d{1,2}$/.test(String(month)) || Number(year) < 2000 || Number(year) > 2100 || Number(month) < 1 || Number(month) > 12) {
        return res.status(400).json({ error: 'Geçerli yıl ve ay seçin.' });
      }
      week = { start: `${year}-${String(month).padStart(2, '0')}-01`,
        end: new Date(Date.UTC(Number(year), Number(month), 1)).toISOString().slice(0, 10) };
    } else week = range(req.query);
    if (!week) return res.status(400).json({ error: 'Geçerli yıl/hafta veya Pazartesi başlayan weekStart gereklidir.' });
    res.json(db.prepare(`SELECT id, title, starts_at AS startsAt, ends_at AS endsAt FROM events
      WHERE child_id = ? AND starts_at >= ? AND starts_at < ? ORDER BY starts_at, id`).all(req.child.id, week.start, week.end));
  });
  router.post('/', requireRole('parent', 'specialist'), (req, res) => {
    const { title, startsAt, endsAt } = req.body || {};
    if (!text(title) || !dateTime(startsAt) || (endsAt != null && endsAt !== '' && (!dateTime(endsAt) || endsAt <= startsAt))) {
      return res.status(400).json({ error: 'Başlık ve geçerli başlangıç saati gerekli; bitiş başlangıçtan sonra olmalıdır.' });
    }
    const result = db.prepare('INSERT INTO events (child_id, created_by, title, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)')
      .run(req.child.id, req.user.id, title.trim(), startsAt, endsAt || null);
    res.status(201).json(db.prepare('SELECT id, title, starts_at AS startsAt, ends_at AS endsAt FROM events WHERE id = ?').get(result.lastInsertRowid));
  });
  return router;
}
module.exports = { eventsRouter };
