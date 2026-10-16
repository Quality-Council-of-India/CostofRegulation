const bcrypt = require('bcryptjs');
const db = require('../db/db');

/** Idempotent: creates the single admin account from env vars if the admin
 *  table is empty. Safe to call on every server start. */
function ensureAdmin() {
  const existing = db.prepare('SELECT COUNT(*) c FROM admin').get();
  if (existing.c > 0) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn(
      '[auth] No admin account exists and ADMIN_PASSWORD is not set. ' +
      'Set ADMIN_USERNAME and ADMIN_PASSWORD in your environment and restart ' +
      'to create the admin login — until then, admin-only features (triggering ' +
      'secondary research) are unreachable.'
    );
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`[auth] Admin account "${username}" created from environment variables.`);
}

function verifyLogin(username, password) {
  const row = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
  if (!row) return false;
  return bcrypt.compareSync(password, row.password_hash);
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'not_authenticated', message: 'Admin login required.' });
}

module.exports = { ensureAdmin, verifyLogin, requireAdmin };
