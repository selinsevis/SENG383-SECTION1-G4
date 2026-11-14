const express = require('express');

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');

  // v0.0 exposes synthetic sample data only. Authentication arrives with M1.
  app.get('/api/tasks', (req, res) => {
    const tasks = db.prepare('SELECT id, title, status FROM tasks ORDER BY id').all();
    res.json(tasks);
  });

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => {
    console.error('API request failed:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = { createApp };
