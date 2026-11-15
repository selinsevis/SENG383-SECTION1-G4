const express = require('express');
const { requireRole } = require('./auth');

function createAdminRouter(db) {
  const router = express.Router();
  router.use(requireRole('admin'));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/overview', (req, res) => {
    db.prepare('SELECT 1').get();
    const count = (table) => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
    res.json({
      status: 'ok',
      checkedAt: new Date().toISOString(),
      runtime: { node: process.version, uptimeSeconds: Math.floor(process.uptime()) },
      database: { status: 'ok', foreignKeys: Boolean(db.pragma('foreign_keys', { simple: true })) },
      counts: { users: count('users'), children: count('children'),
        specialistLinks: count('specialist_links'), tasks: count('tasks') },
    });
  });

  // Explicit projection: hashes and credentials must never enter API responses.
  router.get('/users', (req, res) => {
    res.json(db.prepare(`SELECT id, name, email, role, specialist_type AS specialistType
      FROM users ORDER BY name`).all());
  });

  return router;
}

module.exports = { createAdminRouter };
