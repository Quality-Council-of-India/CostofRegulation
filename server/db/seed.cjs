// Loads server/db/seed-data.enriched.json into Postgres (DATABASE_URL).
// Safe to re-run: wipes and reloads the seeded tables (research_runs and
// admin are left untouched so live admin activity survives a re-seed).
require('dotenv').config();
const path = require('path');
const pool = require('./db');

const data = require('./seed-data.enriched.json');

const toAuto = v => v === true ? 'true' : v === false ? 'false' : v === 'partial' ? 'partial' : null;

async function main() {
  const client = await pool.connect();
  try {
    const fs = require('fs');
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

    await client.query('BEGIN');
    await client.query('DELETE FROM steps; DELETE FROM remarks; DELETE FROM data_gaps; DELETE FROM fgd; DELETE FROM secondary_research; DELETE FROM states; DELETE FROM licenses;');

    await client.query('INSERT INTO licenses (code, name, category, definition) VALUES ($1,$2,$3,$4)',
      [data.SERVICE.code, data.SERVICE.name, data.SERVICE.category, data.SERVICE.definition]);

    const LIC = data.SERVICE.code;

    for (const s of data.STATES) {
      await client.query(`INSERT INTO states
        (code, license_code, name, ed_date, ed_location, ed_expert, ed_designation, issuing_authority,
         portal_name, portal_url, timeline_min, timeline_max, timeline_basis, timeline_text,
         automation_level, applicant_office_visit, deemed_status, deemed_days, deemed_text,
         validity_text, fees_text, documents_note, fgd_pending, secondary_pending)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
        [s.code, LIC, s.name, s.ed.date, s.ed.location, s.ed.expert, s.ed.designation, s.issuingAuthority,
         s.portal.name, s.portalUrl || null,
         s.timeline.minDays ?? null, s.timeline.maxDays ?? null, s.timeline.basis, s.timeline.text,
         s.automationLevel, s.applicantOfficeVisit,
         s.deemedApproval.status, s.deemedApproval.days != null ? String(s.deemedApproval.days) : null, s.deemedApproval.text,
         s.validity.text, s.fees.text, s.documentsNote || '',
         s.fgdPending ? 1 : 0, s.secondary.pending ? 1 : 0]);

      for (const st of s.steps) {
        await client.query('INSERT INTO steps (state_code, license_code, n, phase, title, automated, note, documents_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [s.code, LIC, st.n, st.phase, st.title, toAuto(st.automated), st.note || '', st.documents ? JSON.stringify(st.documents) : null]);
      }
      for (let i = 0; i < s.remarks.length; i++) {
        await client.query('INSERT INTO remarks (state_code, license_code, ord, text) VALUES ($1,$2,$3,$4)', [s.code, LIC, i, s.remarks[i]]);
      }
      for (const g of s.dataGaps) {
        await client.query('INSERT INTO data_gaps (state_code, license_code, text) VALUES ($1,$2,$3)', [s.code, LIC, g]);
      }
      if (!s.fgdPending && s.fgd) {
        await client.query(`INSERT INTO fgd
          (state_code, license_code, meta, process, timeline, automation, documents_note, deemed, complaints_json, costs_json, contradictions_json)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [s.code, LIC, s.fgd.meta, s.fgd.process, s.fgd.timeline, s.fgd.automation, s.fgd.documentsNote || '', s.fgd.deemed,
           JSON.stringify(s.fgd.complaints), JSON.stringify(s.fgd.costs), JSON.stringify(s.fgd.contradictions)]);
      }
      await client.query(`INSERT INTO secondary_research
        (state_code, license_code, confirms_json, contradicts_json, new_detail_json, sources_json, notes, pending)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [s.code, LIC, JSON.stringify(s.secondary.confirms || []), JSON.stringify(s.secondary.contradicts || []),
         JSON.stringify(s.secondary.newDetail || []), JSON.stringify(s.secondary.sources || []),
         s.secondary.notes || '', s.secondary.pending ? 1 : 0]);
    }

    await client.query('COMMIT');
    console.log(`Seeded ${data.STATES.length} states for license ${LIC}.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
