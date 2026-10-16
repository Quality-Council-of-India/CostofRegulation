const express = require('express');
const { verifyLogin, requireAdmin, setAuthCookie, clearAuthCookie, readAuth } = require('../services/auth');
const { runResearch } = require('../services/research');
const pool = require('../db/db');

const router = express.Router();

router.post('/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
    if (!(await verifyLogin(username, password))) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    setAuthCookie(res, username);
    res.json({ ok: true, username });
  } catch (e) { next(e); }
});

router.post('/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/auth/me', (req, res) => {
  const auth = readAuth(req);
  res.json({ isAdmin: !!auth, username: auth?.username || null });
});

router.post('/research/trigger', requireAdmin, async (req, res) => {
  const { stateCode, licenseCode = 'FL' } = req.body || {};
  if (!stateCode) return res.status(400).json({ error: 'missing_state' });
  try {
    const { rows: [state] } = await pool.query('SELECT code FROM states WHERE code=$1 AND license_code=$2', [stateCode, licenseCode]);
    if (!state) return res.status(404).json({ error: 'unknown_state' });
    const runId = await runResearch({ stateCode, licenseCode, triggeredBy: req.admin.username });
    res.json({ ok: true, runId });
  } catch (e) {
    res.status(500).json({ error: 'trigger_failed', message: String(e.message || e) });
  }
});

module.exports = router;
