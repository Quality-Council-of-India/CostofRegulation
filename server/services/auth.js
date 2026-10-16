const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db/db');

const COOKIE_NAME = 'cor_admin';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn('[auth] SESSION_SECRET is not set — using an insecure default. Set it in production.');
    return 'dev-insecure-secret-change-me';
  }
  return secret;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verify(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

/** Idempotent: creates the single admin account from env vars if the admin
 *  table is empty. Safe to call on every request — cheap no-op once it exists. */
async function ensureAdmin() {
  const { rows } = await pool.query('SELECT COUNT(*)::int c FROM admin');
  if (rows[0].c > 0) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn(
      '[auth] No admin account exists and ADMIN_PASSWORD is not set. ' +
      'Set ADMIN_USERNAME and ADMIN_PASSWORD in your environment to create the admin login — ' +
      'until then, admin-only features (triggering secondary research) are unreachable.'
    );
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  await pool.query('INSERT INTO admin (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING', [username, hash]);
  console.log(`[auth] Admin account "${username}" ensured from environment variables.`);
}

async function verifyLogin(username, password) {
  const { rows } = await pool.query('SELECT * FROM admin WHERE username = $1', [username]);
  if (!rows[0]) return false;
  return bcrypt.compareSync(password, rows[0].password_hash);
}

// Minimal hand-rolled cookie serialize/parse — avoids depending on a
// third-party cookie package whose major-version API shape isn't stable
// (the `cookie` npm package rewrote its exports entirely in v2). This app
// only ever sets and reads one cookie with a fixed set of attributes, so
// there's nothing a general-purpose library buys us here.
function serializeAuthCookie(value, maxAgeSeconds) {
  const parts = [`${COOKIE_NAME}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join('; ');
}
function setAuthCookie(res, username) {
  const token = sign({ username, exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  res.setHeader('Set-Cookie', serializeAuthCookie(token, MAX_AGE_SECONDS));
}
function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', serializeAuthCookie('', 0));
}
function readAuth(req) {
  const header = req.headers.cookie || '';
  const match = header.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE_NAME + '='));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  return verify(value);
}

function requireAdmin(req, res, next) {
  const auth = readAuth(req);
  if (auth) { req.admin = auth; return next(); }
  res.status(401).json({ error: 'not_authenticated', message: 'Admin login required.' });
}

module.exports = { ensureAdmin, verifyLogin, requireAdmin, setAuthCookie, clearAuthCookie, readAuth };
