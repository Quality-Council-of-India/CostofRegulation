const express = require('express');
const { verifyLogin, requireAdmin } = require('../services/auth');
const { runResearch } = require('../services/research');
const db = require('../db/db');

const router = express.Router();

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
  if (!verifyLogin(username, password)) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  req.session.isAdmin = true;
  req.session.username = username;
  res.json({ ok: true, username });
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/auth/me', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin), username: req.session?.username || null });
});

router.post('/research/trigger', requireAdmin, async (req, res) => {
  const { stateCode, licenseCode = 'FL' } = req.body || {};
  if (!stateCode) return res.status(400).json({ error: 'missing_state' });
  const state = db.prepare('SELECT code FROM states WHERE code=? AND license_code=?').get(stateCode, licenseCode);
  if (!state) return res.status(404).json({ error: 'unknown_state' });
  try {
    const runId = await runResearch({ stateCode, licenseCode, triggeredBy: req.session.username });
    res.json({ ok: true, runId });
  } catch (e) {
    res.status(500).json({ error: 'trigger_failed', message: String(e.message || e) });
  }
});

module.exports = router;
