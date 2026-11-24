const express = require('express');
const { range } = require('./validation');
const { statistics } = require('./stats');
const { generateSummary } = require('./ai');
function summariesRouter(db) {
  const router = express.Router();
  function summary(id, req) {
    return db.prepare(`SELECT id, child_id AS childId, reader_role AS readerRole, week_start AS weekStart,
      content, mode, created_at AS createdAt FROM ai_summaries
      WHERE id = ? AND child_id = ? AND created_by = ? AND reader_role = ?`)
      .get(id, req.child.id, req.user.id, req.user.role);
  }
  function present(row, req) {
    if (!row) return null;
    return { ...row, label: 'AI-generated', feedback: db.prepare('SELECT feedback FROM ai_feedback WHERE summary_id = ? AND user_id = ?')
      .get(row.id, req.user.id)?.feedback || null,
    sources: db.prepare('SELECT id, source_type AS type, source_id AS recordId FROM ai_summary_sources WHERE summary_id = ? ORDER BY id')
      .all(row.id).map((s) => ({ ...s, url: `/api/children/${req.child.id}/summaries/${row.id}/sources/${s.id}` })) };
  }
  router.post('/', (req, res) => {
    const week = range(req.body || {});
    if (!week) return res.status(400).json({ error: 'Geçerli bir yıl ve hafta seçin.' });
    const sources = [];
    for (const [type, table, field] of [['task', 'tasks', 'due_date'], ['entry', 'entries', 'entry_date'], ['event', 'events', 'starts_at']]) {
      for (const row of db.prepare(`SELECT * FROM ${table} WHERE child_id = ? AND ${field} >= ? AND ${field} < ? ORDER BY id`)
        .all(req.child.id, week.start, week.end)) sources.push({ type, id: row.id, record: row });
    }
    const result = generateSummary({ role: req.user.role, week, stats: statistics(db, req.child.id, week), sources });
    const id = db.transaction(() => {
      const saved = db.prepare(`INSERT INTO ai_summaries (child_id, created_by, reader_role, week_start, content, mode)
        VALUES (?, ?, ?, ?, ?, ?)`).run(req.child.id, req.user.id, req.user.role, week.start, result.content, result.mode);
      const insert = db.prepare('INSERT INTO ai_summary_sources (summary_id, source_type, source_id, snapshot) VALUES (?, ?, ?, ?)');
      for (const source of sources) insert.run(saved.lastInsertRowid, source.type, source.id, JSON.stringify(source.record));
      return saved.lastInsertRowid;
    })();
    res.status(201).json(present(summary(id, req), req));
  });
  router.get('/', (req, res) => {
    const week = range(req.query);
    if (!week) return res.status(400).json({ error: 'Geçerli bir yıl ve hafta seçin.' });
    const row = db.prepare(`SELECT id FROM ai_summaries WHERE child_id = ? AND created_by = ? AND reader_role = ? AND week_start = ? ORDER BY id DESC LIMIT 1`)
      .get(req.child.id, req.user.id, req.user.role, week.start);
    res.json(row ? present(summary(row.id, req), req) : null);
  });
  router.get('/:summaryId/sources/:sourceId', (req, res) => {
    if (!summary(req.params.summaryId, req)) return res.status(404).json({ error: 'Özet bulunamadı.' });
    const source = db.prepare('SELECT snapshot FROM ai_summary_sources WHERE id = ? AND summary_id = ?')
      .get(req.params.sourceId, req.params.summaryId);
    if (!source) return res.status(404).json({ error: 'Kaynak bulunamadı.' });
    res.json(JSON.parse(source.snapshot));
  });
  router.post('/:summaryId/feedback', (req, res) => {
    if (!summary(req.params.summaryId, req)) return res.status(404).json({ error: 'Özet bulunamadı.' });
    if (!['helpful', 'incorrect'].includes(req.body?.feedback)) return res.status(400).json({ error: 'Geçerli geri bildirim seçin.' });
    db.prepare(`INSERT INTO ai_feedback (summary_id, user_id, feedback) VALUES (?, ?, ?)
      ON CONFLICT(summary_id, user_id) DO UPDATE SET feedback = excluded.feedback`)
      .run(req.params.summaryId, req.user.id, req.body.feedback);
    res.json({ feedback: req.body.feedback });
  });
  return router;
}
module.exports = { summariesRouter };
