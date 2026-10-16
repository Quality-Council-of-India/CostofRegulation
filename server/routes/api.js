const express = require('express');
const pool = require('../db/db');

const router = express.Router();
const j = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

async function fullState(code, license) {
  const { rows: [s] } = await pool.query('SELECT * FROM states WHERE code = $1 AND license_code = $2', [code, license]);
  if (!s) return null;
  const { rows: stepRows } = await pool.query('SELECT * FROM steps WHERE state_code=$1 AND license_code=$2 ORDER BY n', [code, license]);
  const steps = stepRows.map(st => ({ ...st, automated: st.automated === 'true' ? true : st.automated === 'false' ? false : st.automated === 'partial' ? 'partial' : null, documents: j(st.documents_json, null) }));
  const { rows: remarkRows } = await pool.query('SELECT text FROM remarks WHERE state_code=$1 AND license_code=$2 ORDER BY ord', [code, license]);
  const remarks = remarkRows.map(r => r.text);
  const { rows: gapRows } = await pool.query('SELECT text FROM data_gaps WHERE state_code=$1 AND license_code=$2', [code, license]);
  const dataGaps = gapRows.map(r => r.text);
  const { rows: [fgdRow] } = await pool.query('SELECT * FROM fgd WHERE state_code=$1 AND license_code=$2', [code, license]);
  const { rows: [secRow] } = await pool.query('SELECT * FROM secondary_research WHERE state_code=$1 AND license_code=$2', [code, license]);

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

router.get('/licenses', async (req, res, next) => {
  try { const { rows } = await pool.query('SELECT * FROM licenses'); res.json(rows); }
  catch (e) { next(e); }
});

router.get('/states', async (req, res, next) => {
  try {
    const license = req.query.license || 'FL';
    const { rows } = await pool.query('SELECT code FROM states WHERE license_code = $1 ORDER BY name', [license]);
    const states = await Promise.all(rows.map(r => fullState(r.code, license)));
    res.json(states);
  } catch (e) { next(e); }
});

router.get('/states/:code', async (req, res, next) => {
  try {
    const license = req.query.license || 'FL';
    const state = await fullState(req.params.code.toUpperCase(), license);
    if (!state) return res.status(404).json({ error: 'not_found' });
    res.json(state);
  } catch (e) { next(e); }
});

router.get('/research/runs', async (req, res, next) => {
  try {
    const { state, license = 'FL', limit = 50 } = req.query;
    const { rows } = state
      ? await pool.query('SELECT * FROM research_runs WHERE state_code=$1 AND license_code=$2 ORDER BY triggered_at DESC LIMIT $3', [state, license, Number(limit)])
      : await pool.query('SELECT * FROM research_runs WHERE license_code=$1 ORDER BY triggered_at DESC LIMIT $2', [license, Number(limit)]);
    res.json(rows.map(r => ({ ...r, parsed: j(r.parsed_json, null), sources: j(r.sources_json, []) })));
  } catch (e) { next(e); }
});

router.get('/research/runs/:id', async (req, res, next) => {
  try {
    const { rows: [row] } = await pool.query('SELECT * FROM research_runs WHERE id=$1', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json({ ...row, parsed: j(row.parsed_json, null), sources: j(row.sources_json, []) });
  } catch (e) { next(e); }
});

module.exports = router;
