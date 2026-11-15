const express = require('express');
const { range } = require('./validation');
const { AREAS } = require('./tasks');
function statistics(db, childId, week) {
  const rows = db.prepare(`SELECT area, COUNT(*) AS total, SUM(status = 'done') AS done FROM tasks
    WHERE child_id = ? AND due_date >= ? AND due_date < ? GROUP BY area`).all(childId, week.start, week.end);
  const total = rows.reduce((n, r) => n + r.total, 0), done = rows.reduce((n, r) => n + r.done, 0);
  const rate = (done, total) => total ? Math.round(done / total * 1000) / 10 : 0;
  return { ...week, total, done, completionRate: rate(done, total), byArea: AREAS.map((area) => {
    const row = rows.find((r) => r.area === area) || { total: 0, done: 0 };
    return { area, ...row, completionRate: rate(row.done, row.total) };
  }) };
}
function statsRouter(db) {
  const router = express.Router();
  router.get('/', (req, res) => {
    const week = range(req.query);
    if (!week) return res.status(400).json({ error: 'Geçerli bir hafta seçin.' });
    res.json(statistics(db, req.child.id, week));
  });
  return router;
}
module.exports = { statsRouter, statistics };
