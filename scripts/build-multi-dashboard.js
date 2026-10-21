#!/usr/bin/env node
/* Builds cor-dashboard.html (multi-license edition) from:
 *   - scripts/ed_data/<CODE>.json   (per-state structured+tagged ED extraction, one entry per license)
 *   - scripts/services.json         (canonical 26-service catalog)
 *   - scripts/states.json           (canonical 36-state/UT universe)
 *   - scripts/phase-template.json   (7-stage process taxonomy)
 *   - scripts/dashboard.template.html (page shell; the only hand-edited source for layout/styling)
 *
 * Run: node scripts/build-multi-dashboard.js
 * Output: cor-dashboard.html at the repo root.
 *
 * This is the ED-only, all-licenses pass — FGD and secondary (web) research
 * are on hold for this expanded scope (see Method & Data Quality in the
 * built page). The earlier Factory-License-only pilot's richer FGD +
 * secondary-research data (scripts/tagged/*.json) is preserved in the repo
 * for when that gets merged back in.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ED_DIR = path.join(__dirname, 'ed_data');
const SERVICES = JSON.parse(fs.readFileSync(path.join(__dirname, 'services.json'), 'utf8'));
const STATE_UNIVERSE = JSON.parse(fs.readFileSync(path.join(__dirname, 'states.json'), 'utf8'));
const PHASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'phase-template.json'), 'utf8')).phases;

const stateFiles = fs.readdirSync(ED_DIR).filter(f => f.endsWith('.json')).sort();

const states = stateFiles.map(f => {
  const d = JSON.parse(fs.readFileSync(path.join(ED_DIR, f), 'utf8'));
  // light normalization + derived fields per license
  d.licenses.forEach(lic => {
    lic.steps = lic.steps || [];
    lic._stepCount = lic.steps.length;
    const nonInspect = lic.steps.filter(s => s.phase !== 'inspect');
    const onlineCount = nonInspect.filter(s => s.automated === true).length;
    lic._autoShare = nonInspect.length ? onlineCount / nonInspect.length : null;
    lic._timeMid = (lic.timeline && lic.timeline.minDays != null && lic.timeline.maxDays != null)
      ? (lic.timeline.minDays + lic.timeline.maxDays) / 2 : null;
    lic.findings = lic.findings || [];
    lic.gaps = lic.gaps || [];
    lic.remarks = lic.remarks || [];
    lic.dataGaps = lic.dataGaps || [];
  });
  return d;
});

const stateByCode = {};
states.forEach(s => { stateByCode[s.code] = s; });

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
let totalFindings = 0, totalLicenses = 0;
states.forEach(s => {
  s.licenses.forEach(lic => {
    totalLicenses++;
    totalFindings += lic.findings.length;
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
    scope: 'All licenses, all States/UTs with a completed Expert Discussion — FGD and secondary (web) research are on hold for this expanded pass.',
    sourcesNote: 'Every finding is traced to the real Expert Discussion transcript for that State and license — nothing is invented. See Method & Data Quality.'
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

console.log('Built cor-dashboard.html —', states.length, 'states,', SERVICES.length, 'services,', totalLicenses, 'license entries,', totalFindings, 'findings,', allGaps.length, 'gaps.');
console.log('Gap flags:', JSON.stringify(gapFlagCounts));
