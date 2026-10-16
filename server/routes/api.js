const express = require('express');
const db = require('../db/db');

const router = express.Router();
const j = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

function fullState(code, license) {
  const s = db.prepare('SELECT * FROM states WHERE code = ? AND license_code = ?').get(code, license);
  if (!s) return null;
  const steps = db.prepare('SELECT * FROM steps WHERE state_code=? AND license_code=? ORDER BY n').all(code, license)
    .map(st => ({ ...st, automated: st.automated === 'true' ? true : st.automated === 'false' ? false : st.automated === 'partial' ? 'partial' : null, documents: j(st.documents_json, null) }));
  const remarks = db.prepare('SELECT text FROM remarks WHERE state_code=? AND license_code=? ORDER BY ord').all(code, license).map(r => r.text);
  const dataGaps = db.prepare('SELECT text FROM data_gaps WHERE state_code=? AND license_code=?').all(code, license).map(r => r.text);
  const fgdRow = db.prepare('SELECT * FROM fgd WHERE state_code=? AND license_code=?').get(code, license);
  const secRow = db.prepare('SELECT * FROM secondary_research WHERE state_code=? AND license_code=?').get(code, license);

  const stepCount = steps.length;
  const nonInspect = steps.filter(st => st.phase !== 'inspect');
  const autoShare = nonInspect.length ? nonInspect.filter(st => st.automated === true).length / nonInspect.length : null;
  const timeMid = s.timeline_min != null && s.timeline_max != null ? (s.timeline_min + s.timeline_max) / 2 : null;

  return {
    code: s.code, name: s.name,
    ed: { date: s.ed_date, location: s.ed_location, expert: s.ed_expert, designation: s.ed_designation },
    issuingAuthority: s.issuing_authority,
    portal: { name: s.portal_name, url: s.portal_url },
    steps, remarks, dataGaps,
    timeline: { minDays: s.timeline_min, maxDays: s.timeline_max, basis: s.timeline_basis, text: s.timeline_text },
    automationLevel: s.automation_level, applicantOfficeVisit: s.applicant_office_visit,
    deemedApproval: { status: s.deemed_status, days: s.deemed_days, text: s.deemed_text },
    validity: { text: s.validity_text }, fees: { text: s.fees_text }, documentsNote: s.documents_note,
    fgdPending: !!s.fgd_pending,
    fgd: fgdRow ? {
      meta: fgdRow.meta, process: fgdRow.process, timeline: fgdRow.timeline, automation: fgdRow.automation,
      documentsNote: fgdRow.documents_note, deemed: fgdRow.deemed,
      complaints: j(fgdRow.complaints_json, []), costs: j(fgdRow.costs_json, []), contradictions: j(fgdRow.contradictions_json, [])
    } : null,
    secondary: {
      pending: !secRow || !!secRow.pending,
      confirms: j(secRow?.confirms_json, []), contradicts: j(secRow?.contradicts_json, []),
      newDetail: j(secRow?.new_detail_json, []), sources: j(secRow?.sources_json, []),
      notes: secRow?.notes || '', lastRunId: secRow?.last_run_id || null, updatedAt: secRow?.updated_at || null
    },
    _stepCount: stepCount, _autoShare: autoShare, _timeMid: timeMid,
    _hasInspection: steps.some(st => st.phase === 'inspect')
  };
}

router.get('/licenses', (req, res) => {
  res.json(db.prepare('SELECT * FROM licenses').all());
});

router.get('/states', (req, res) => {
  const license = req.query.license || 'FL';
  const codes = db.prepare('SELECT code FROM states WHERE license_code = ? ORDER BY name').all(license).map(r => r.code);
  res.json(codes.map(c => fullState(c, license)));
});

router.get('/states/:code', (req, res) => {
  const license = req.query.license || 'FL';
  const state = fullState(req.params.code.toUpperCase(), license);
  if (!state) return res.status(404).json({ error: 'not_found' });
  res.json(state);
});

router.get('/research/runs', (req, res) => {
  const { state, license = 'FL', limit = 50 } = req.query;
  let rows;
  if (state) {
    rows = db.prepare('SELECT * FROM research_runs WHERE state_code=? AND license_code=? ORDER BY triggered_at DESC LIMIT ?')
      .all(state, license, Number(limit));
  } else {
    rows = db.prepare('SELECT * FROM research_runs WHERE license_code=? ORDER BY triggered_at DESC LIMIT ?')
      .all(license, Number(limit));
  }
  res.json(rows.map(r => ({ ...r, parsed: j(r.parsed_json, null), sources: j(r.sources_json, []) })));
});

router.get('/research/runs/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM research_runs WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json({ ...row, parsed: j(row.parsed_json, null), sources: j(row.sources_json, []) });
});

module.exports = router;
