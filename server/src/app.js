const express = require('express');
const { createAuthRouter, authenticate } = require('./auth');
const { createChildrenRouter } = require('./children');

function createApp(db, { jwtSecret } = {}) {
  if (!jwtSecret) throw new Error('createApp needs a jwtSecret');

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/auth', createAuthRouter(db, jwtSecret));
  // Everything about a child needs a logged-in user (M2).
  app.use('/api/children', authenticate(db, jwtSecret), createChildrenRouter(db));

  // v0.0 walking skeleton endpoint with synthetic data. It is replaced by the
  // protected task API in M4, so it stays open for now.
  app.get('/api/tasks', (req, res) => {
    const tasks = db.prepare('SELECT id, title, status FROM tasks ORDER BY id').all();
    res.json(tasks);
  });

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => {
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
