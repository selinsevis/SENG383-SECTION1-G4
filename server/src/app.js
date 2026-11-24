const express = require('express');
const { createAuthRouter, authenticate } = require('./auth');
const { createChildrenRouter, canAccessChild } = require('./children');
const { createEntriesRouter } = require('./entries');
const { createAdminRouter } = require('./admin');
const { requireRole } = require('./auth');
const { tasksRouter } = require('./tasks');
const { documentsRouter } = require('./documents');

function createApp(db, { jwtSecret } = {}) {
  if (!jwtSecret) throw new Error('createApp needs a jwtSecret');

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/auth', createAuthRouter(db, jwtSecret));
  app.use('/api/admin', authenticate(db, jwtSecret), createAdminRouter(db));
  // Everything about a child needs a logged-in user (M2).
  app.use('/api/children', authenticate(db, jwtSecret), createChildrenRouter(db));
  app.use('/api/entries', authenticate(db, jwtSecret), createEntriesRouter(db, canAccessChild(db)));

  app.use('/api/tasks', authenticate(db, jwtSecret), tasksRouter(db));
  app.use('/api/documents', authenticate(db, jwtSecret), requireRole('parent', 'specialist', 'admin'),
    documentsRouter(db, canAccessChild(db)));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => {
    if (err.code?.startsWith('LIMIT_')) return res.status(400).json({ error: 'Bir adet PDF/PNG/JPEG dosyası seçin (en fazla 5 MB).' });
    if (err.status === 503) return res.status(503).json({ error: err.message });
    // A request body that is not valid JSON is the client's mistake, not a server error.
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }
    console.error('API request failed:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = { createApp };
