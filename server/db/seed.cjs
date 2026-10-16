// Loads server/db/seed-data.enriched.json into the SQLite database at
// server/db/cor.sqlite. Safe to re-run: wipes and reloads the seeded tables
// (research_runs and admin are left untouched so live admin activity survives
// a re-seed).
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'cor.sqlite');
const db = new DatabaseSync(DB_PATH);
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const data = require('./seed-data.enriched.json');

db.exec('BEGIN');
try {
  db.exec('DELETE FROM steps; DELETE FROM remarks; DELETE FROM data_gaps; DELETE FROM fgd; DELETE FROM secondary_research; DELETE FROM states; DELETE FROM licenses;');

  db.prepare('INSERT INTO licenses (code, name, category, definition) VALUES (?, ?, ?, ?)')
    .run(data.SERVICE.code, data.SERVICE.name, data.SERVICE.category, data.SERVICE.definition);

  const insState = db.prepare(`INSERT INTO states
    (code, license_code, name, ed_date, ed_location, ed_expert, ed_designation, issuing_authority,
     portal_name, portal_url, timeline_min, timeline_max, timeline_basis, timeline_text,
     automation_level, applicant_office_visit, deemed_status, deemed_days, deemed_text,
     validity_text, fees_text, documents_note, fgd_pending, secondary_pending)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insStep = db.prepare(`INSERT INTO steps
    (state_code, license_code, n, phase, title, automated, note, documents_json) VALUES (?,?,?,?,?,?,?,?)`);
  const insRemark = db.prepare('INSERT INTO remarks (state_code, license_code, ord, text) VALUES (?,?,?,?)');
  const insGap = db.prepare('INSERT INTO data_gaps (state_code, license_code, text) VALUES (?,?,?)');
  const insFgd = db.prepare(`INSERT INTO fgd
    (state_code, license_code, meta, process, timeline, automation, documents_note, deemed,
     complaints_json, costs_json, contradictions_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const insSec = db.prepare(`INSERT INTO secondary_research
    (state_code, license_code, confirms_json, contradicts_json, new_detail_json, sources_json, notes, pending)
    VALUES (?,?,?,?,?,?,?,?)`);

  const LIC = data.SERVICE.code;
  const toAuto = v => v === true ? 'true' : v === false ? 'false' : v === 'partial' ? 'partial' : null;

  for (const s of data.STATES) {
    insState.run(
      s.code, LIC, s.name, s.ed.date, s.ed.location, s.ed.expert, s.ed.designation, s.issuingAuthority,
      s.portal.name, s.portalUrl || null,
      s.timeline.minDays ?? null, s.timeline.maxDays ?? null, s.timeline.basis, s.timeline.text,
      s.automationLevel, s.applicantOfficeVisit,
      s.deemedApproval.status, s.deemedApproval.days != null ? String(s.deemedApproval.days) : null, s.deemedApproval.text,
      s.validity.text, s.fees.text, s.documentsNote || '',
      s.fgdPending ? 1 : 0, s.secondary.pending ? 1 : 0
    );
    for (const st of s.steps) {
      insStep.run(s.code, LIC, st.n, st.phase, st.title, toAuto(st.automated), st.note || '',
        st.documents ? JSON.stringify(st.documents) : null);
    }
    s.remarks.forEach((r, i) => insRemark.run(s.code, LIC, i, r));
    s.dataGaps.forEach(g => insGap.run(s.code, LIC, g));
    if (!s.fgdPending && s.fgd) {
      insFgd.run(s.code, LIC, s.fgd.meta, s.fgd.process, s.fgd.timeline, s.fgd.automation,
        s.fgd.documentsNote || '', s.fgd.deemed,
        JSON.stringify(s.fgd.complaints), JSON.stringify(s.fgd.costs), JSON.stringify(s.fgd.contradictions));
    }
    insSec.run(s.code, LIC,
      JSON.stringify(s.secondary.confirms || []), JSON.stringify(s.secondary.contradicts || []),
      JSON.stringify(s.secondary.newDetail || []), JSON.stringify(s.secondary.sources || []),
      s.secondary.notes || '', s.secondary.pending ? 1 : 0);
  }

  db.exec('COMMIT');
  console.log(`Seeded ${data.STATES.length} states for license ${LIC} into ${DB_PATH}`);
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
} finally {
  db.close();
}
