const express = require('express');
const { requireRole } = require('./auth');
const { date, text } = require('./validation');
const AREAS = ['language', 'motor', 'social', 'cognitive', 'self_care'];
const SELECT = `SELECT t.id, t.child_id AS childId, c.name AS childName, t.assigned_by AS assignedBy,
  t.title, t.description, t.area, t.due_date AS dueDate, t.status, t.completed_at AS completedAt
  FROM tasks t JOIN children c ON c.id = t.child_id`;
function childTasks(db) {
  const router = express.Router();
  router.get('/', (req, res) => res.json(db.prepare(`${SELECT} WHERE t.child_id = ? ORDER BY t.due_date, t.id`).all(req.child.id)));
  router.post('/', requireRole('parent', 'specialist'), (req, res) => {
    const { title, description, area, dueDate } = req.body || {};
    if (!text(title) || typeof description !== 'string' || description.length > 5000 || !AREAS.includes(area) || !date(dueDate)) {
      return res.status(400).json({ error: 'Başlık, açıklama, gelişim alanı ve geçerli son tarih gereklidir.' });
    }
    const result = db.prepare(`INSERT INTO tasks (child_id, assigned_by, title, description, area, due_date)
      VALUES (?, ?, ?, ?, ?, ?)`).run(req.child.id, req.user.id, title.trim(), description.trim(), area, dueDate);
    res.status(201).json(db.prepare(`${SELECT} WHERE t.id = ?`).get(result.lastInsertRowid));
  });
  return router;
}
function tasksRouter(db) {
  const router = express.Router();
  router.get('/assigned-by-me', requireRole('parent', 'specialist'), (req, res) => {
    // Specialist links are checked again, even for previously assigned tasks.
    const rows = db.prepare(`${SELECT} WHERE t.assigned_by = ? AND (
      (? = 'parent' AND c.parent_id = ?) OR (? = 'specialist' AND EXISTS (
        SELECT 1 FROM specialist_links l WHERE l.child_id = c.id AND l.specialist_id = ?)))
      ORDER BY t.due_date, t.id`).all(req.user.id, req.user.role, req.user.id, req.user.role, req.user.id);
    res.json(rows);
  });
  router.patch('/:taskId/:action', requireRole('child'), (req, res) => {
    if (!['complete', 'undo'].includes(req.params.action)) return res.status(404).json({ error: 'Not found' });
    const task = db.prepare(`${SELECT} WHERE t.id = ?`).get(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Görev bulunamadı.' });
    const child = db.prepare('SELECT user_id FROM children WHERE id = ?').get(task.childId);
    if (child.user_id !== req.user.id) return res.status(403).json({ error: 'Bu görev sana ait değil.' });
    if (req.params.action === 'undo') {
      db.prepare("UPDATE tasks SET status = 'open', completed_at = NULL WHERE id = ?").run(task.id);
    } else {
      db.prepare("UPDATE tasks SET status = 'done', completed_at = COALESCE(completed_at, datetime('now')) WHERE id = ?").run(task.id);
    }
    res.json(db.prepare(`${SELECT} WHERE t.id = ?`).get(task.id));
  });
  return router;
}
module.exports = { childTasks, tasksRouter, AREAS };
