const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const TOKEN_LIFETIME = '8h';

// Only these fields are ever sent to the frontend; password_hash never leaves the backend.
function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

// Checks the "Authorization: Bearer <token>" header (FR-M1-05).
// On success it puts the current user on req.user; otherwise it answers 401.
function authenticate(db, jwtSecret) {
  return (req, res, next) => {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Login required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Read the user again from the database, so a deleted account cannot keep using an old token.
    const row = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.sub);
    if (!row) return res.status(401).json({ error: 'Invalid or expired token' });

    req.user = publicUser(row);
    next();
  };
}

// Allows the request only for the given roles (FR-M1-04); otherwise 403.
// Must be used after authenticate.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action' });
    }
    next();
  };
}

function createAuthRouter(db, jwtSecret) {
  const router = express.Router();

  // FR-M1-01, FR-M1-02, FR-M1-03: log in with email and password; the role comes from the account.
  router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    // Same message for a wrong email and a wrong password, so the API does not reveal which emails exist.
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ sub: row.id, role: row.role }, jwtSecret, { expiresIn: TOKEN_LIFETIME });
    res.json({ token, user: publicUser(row) });
  });

  // Returns the logged-in user; the frontend uses it to restore the session after a page refresh.
  router.get('/me', authenticate(db, jwtSecret), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

module.exports = { createAuthRouter, authenticate, requireRole };
