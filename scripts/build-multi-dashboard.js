#!/usr/bin/env node
/* Builds cor-dashboard.html (multi-license edition) from:
 *   - scripts/ed_data/<CODE>.json   (per-state structured+tagged ED extraction, one entry per license)
 *   - scripts/fgd_data/<CODE>.json  (per-state FGD findings/quotes/gaps, merged onto the ED record
 *     where one exists for that state+service (Mode A), or added as a new FGD-only license entry
 *     where it doesn't (Mode B, hasED:false))
 *   - scripts/services.json         (canonical service catalog)
 *   - scripts/states.json           (canonical 36-state/UT universe)
 *   - scripts/phase-template.json   (7-stage process taxonomy)
 *   - scripts/dashboard-multi.template.html (page shell; the only hand-edited source for layout/styling)
 *
 * Run: node scripts/build-multi-dashboard.js
 * Output: cor-dashboard.html at the repo root.
 *
 * Secondary (web) research remains on hold for this expanded scope (see
 * Method & Data Quality in the built page). The earlier Factory-License-only
 * pilot's richer secondary-research data (scripts/tagged/*.json) is preserved
 * in the repo for when that gets merged back in.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ED_DIR = path.join(__dirname, 'ed_data');
const FGD_DIR = path.join(__dirname, 'fgd_data');
const SERVICES = JSON.parse(fs.readFileSync(path.join(__dirname, 'services.json'), 'utf8'));
const STATE_UNIVERSE = JSON.parse(fs.readFileSync(path.join(__dirname, 'states.json'), 'utf8'));
const PHASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'phase-template.json'), 'utf8')).phases;

const stateFiles = fs.readdirSync(ED_DIR).filter(f => f.endsWith('.json')).sort();

const states = stateFiles.map(f => JSON.parse(fs.readFileSync(path.join(ED_DIR, f), 'utf8')));

const stateByCode = {};
states.forEach(s => { stateByCode[s.code] = s; });

// ---- merge in FGD data ----
// normalize a tags field that should be an array but one extraction agent wrote as a bare string
const normTags = t => Array.isArray(t) ? t : (t ? [t] : []);

const fgdFiles = fs.existsSync(FGD_DIR) ? fs.readdirSync(FGD_DIR).filter(f => f.endsWith('.json')).sort() : [];
let fgdLicensesMerged = 0, fgdLicensesAdded = 0;
fgdFiles.forEach(f => {
  const fd = JSON.parse(fs.readFileSync(path.join(FGD_DIR, f), 'utf8'));
  let st = stateByCode[fd.code];
  if (!st) {
    st = { code: fd.code, name: fd.name, licenses: [] };
    states.push(st);
    stateByCode[fd.code] = st;
  }
  (fd.licenses || []).forEach(flic => {
    const findings = (flic.findings || []).map(x => ({ ...x, tags: normTags(x.tags) }));
    const quotes = (flic.quotes || []).map(x => ({ ...x, tags: normTags(x.tags) }));
    const gaps = flic.gaps || [];
    const existing = st.licenses.find(l => l.serviceCode === flic.serviceCode);

    if (flic.hasED && existing) {
      // Mode A: ED record stays authoritative for structured fields; FGD adds findings/quotes/gaps
      existing.findings = (existing.findings || []).concat(findings);
      existing.quotes = (existing.quotes || []).concat(quotes);
      existing.gaps = (existing.gaps || []).concat(gaps);
      existing.fgdSourceFiles = flic.sourceFiles;
      existing.fgdSessionCount = flic.sessionCount;
      existing.hasFGD = true;
      fgdLicensesMerged++;
    } else {
      // Mode B: no ED record for this (state, service) — add a new FGD-only license entry
      const newLic = {
        serviceCode: flic.serviceCode, serviceName: flic.serviceName,
        issuingAuthority: flic.issuingAuthority || null, portal: flic.portal || null,
        timeline: flic.timeline || null, automationLevel: flic.automationLevel || null,
        applicantOfficeVisit: flic.applicantOfficeVisit || null,
        documents: flic.documents || [], documentsNote: flic.documentsNote || null,
        deemedApproval: flic.deemedApproval || null, validity: flic.validity || null, fees: flic.fees || null,
        steps: flic.steps || [], ed: null,
        remarks: flic.remarks || [], dataGaps: [],
        findings, quotes, gaps,
        fgdSourceFiles: flic.sourceFiles, fgdSessionCount: flic.sessionCount,
        hasED: false, hasFGD: true
      };
      st.licenses.push(newLic);
      fgdLicensesAdded++;
    }
  });
});

// light normalization + derived fields per license (after merge, so FGD-only licenses get them too)
states.forEach(d => {
  d.licenses.forEach(lic => {
    lic.steps = lic.steps || [];
    lic._stepCount = lic.steps.length;
    const nonInspect = lic.steps.filter(s => s.phase !== 'inspect');
    const onlineCount = nonInspect.filter(s => s.automated === true).length;
    lic._autoShare = nonInspect.length ? onlineCount / nonInspect.length : null;
    lic._timeMid = (lic.timeline && lic.timeline.minDays != null && lic.timeline.maxDays != null)
      ? (lic.timeline.minDays + lic.timeline.maxDays) / 2 : null;
    lic.findings = lic.findings || [];
    lic.quotes = lic.quotes || [];
    lic.gaps = lic.gaps || [];
    lic.remarks = lic.remarks || [];
    lic.dataGaps = lic.dataGaps || [];
  });
});

// ---- coverage matrix: for each state, which service codes have data ----
const coverage = {}; // coverage[stateCode][serviceCode] = {findings, gaps}
states.forEach(s => {
  coverage[s.code] = {};
  s.licenses.forEach(lic => {
    coverage[s.code][lic.serviceCode] = { findings: lic.findings.length, gaps: lic.gaps.length };
  });
});

// ---- per-service aggregates ----
const byService = {};
SERVICES.forEach(sv => { byService[sv.code] = { code: sv.code, name: sv.name, states: [], totalFindings: 0, totalGaps: 0 }; });
states.forEach(s => {
  s.licenses.forEach(lic => {
    if (!byService[lic.serviceCode]) byService[lic.serviceCode] = { code: lic.serviceCode, name: lic.serviceName, states: [], totalFindings: 0, totalGaps: 0 };
    byService[lic.serviceCode].states.push(s.code);
    byService[lic.serviceCode].totalFindings += lic.findings.length;
    byService[lic.serviceCode].totalGaps += lic.gaps.length;
  });
});

// ---- global gap rollups (for Good Practices / Inconsistencies / Data Gaps views) ----
const allGaps = [];
let totalFindings = 0, totalLicenses = 0, totalQuotes = 0, licensesWithFGD = 0;
states.forEach(s => {
  s.licenses.forEach(lic => {
    totalLicenses++;
    totalFindings += lic.findings.length;
    totalQuotes += (lic.quotes || []).length;
    if (lic.hasFGD) licensesWithFGD++;
    lic.gaps.forEach(g => allGaps.push({
      state: s.code, stateName: s.name,
      serviceCode: lic.serviceCode, serviceName: lic.serviceName,
      ...g
    }));
  });
});
const gapFlagCounts = {};
allGaps.forEach(g => { gapFlagCounts[g.flag] = (gapFlagCounts[g.flag] || 0) + 1; });
const by = flag => allGaps.filter(g => g.flag === flag);

const DATA = {
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    scope: 'All licenses, all States/UTs with a completed Expert Discussion and/or Focused Group Discussion — secondary (web) research is on hold for this expanded pass.',
    sourcesNote: 'Every finding is traced to the real Expert Discussion or Focused Group Discussion transcript for that State and license — nothing is invented. Where FGD testimony genuinely contradicts the official ED record, it is flagged as an inconsistency with both sides quoted. See Method & Data Quality.'
  },
  services: SERVICES,
  stateUniverse: STATE_UNIVERSE,
  phases: PHASES,
  states,
  coverage,
  aggregates: {
    totalStates: states.length,
    totalServices: SERVICES.length,
    totalLicenses,
    totalFindings,
    totalQuotes,
    licensesWithFGD,
    totalGaps: allGaps.length,
    gapFlagCounts,
    byService,
    goodPractices: by('GOOD_PRACTICE'),
    reforms: by('REFORM'),
    inconsistencies: by('INCONSISTENT'),
    missing: by('MISSING'),
    vague: by('VAGUE')
  }
};

const template = fs.readFileSync(path.join(__dirname, 'dashboard-multi.template.html'), 'utf8');
const out = template.replace('/*__DATA__*/', JSON.stringify(DATA));
fs.writeFileSync(path.join(ROOT, 'cor-dashboard.html'), out);

console.log('Built cor-dashboard.html —', states.length, 'states,', SERVICES.length, 'services,', totalLicenses, 'license entries,', totalFindings, 'findings,', totalQuotes, 'quotes,', allGaps.length, 'gaps.');
console.log('FGD merged into', fgdLicensesMerged, 'existing ED licenses (Mode A); added', fgdLicensesAdded, 'new FGD-only licenses (Mode B).');
console.log('Gap flags:', JSON.stringify(gapFlagCounts));
