#!/usr/bin/env node
/* Rebuilds cor-dashboard.html from:
 *   - server/db/seed-data.json       (ED/FGD/secondary content, process steps)
 *   - scripts/tagged/<CODE>.json     (tagged findings/quotes/gaps per State — see scripts/taxonomy.md)
 *   - scripts/phase-template.json    (the 7-stage process taxonomy, already present in seed-data step.phase)
 *   - scripts/dashboard.template.html (page shell; the only hand-edited source for layout/styling)
 *
 * Run: node scripts/build-dashboard.js
 * Output: cor-dashboard.html at the repo root (self-contained, no server needed).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// Runs the enrichment pass first (confirmed portal URLs + per-step document
// checklists layered onto the raw ED/FGD record — see server/db/enrich.cjs)
// so cor-dashboard.html always reflects the latest enrichment, not a
// possibly-stale seed-data.enriched.json left over from a previous run.
require(path.join(ROOT, 'server/db/enrich.cjs'));
const SEED = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/db/seed-data.enriched.json'), 'utf8'));
const TAGGED_DIR = path.join(__dirname, 'tagged');
const PHASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'phase-template.json'), 'utf8')).phases;

const codes = fs.readdirSync(TAGGED_DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).sort();

const states = codes.map(code => {
  const base = SEED.STATES.find(s => s.code === code);
  if (!base) throw new Error('No seed-data.json STATES entry for code ' + code);
  const tagged = JSON.parse(fs.readFileSync(path.join(TAGGED_DIR, code + '.json'), 'utf8'));
  if (tagged.code !== code) throw new Error('code mismatch in ' + code + '.json');

  return {
    code,
    name: base.name,
    fgdPending: base.fgdPending,
    issuingAuthority: base.issuingAuthority,
    portal: base.portal,
    timeline: base.timeline,
    automationLevel: base.automationLevel,
    applicantOfficeVisit: base.applicantOfficeVisit,
    documents: base.documents,
    documentsNote: base.documentsNote,
    deemedApproval: base.deemedApproval,
    validity: base.validity,
    fees: base.fees,
    steps: base.steps,
    ed: base.ed,
    fgdMeta: base.fgd ? base.fgd.meta : null,
    findings: tagged.findings,
    quotes: tagged.quotes,
    gaps: tagged.gaps
  };
});

const gapFlagCounts = {};
const allGaps = [];
for (const s of states) {
  for (const g of s.gaps) {
    gapFlagCounts[g.flag] = (gapFlagCounts[g.flag] || 0) + 1;
    allGaps.push({ state: s.code, stateName: s.name, ...g });
  }
}

const by = flag => allGaps.filter(g => g.flag === flag);
const tagCounts = {};
let totalFindings = 0, totalQuotes = 0;
for (const s of states) {
  totalFindings += s.findings.length;
  totalQuotes += s.quotes.length;
  for (const f of s.findings) for (const t of (f.tags || [])) tagCounts[t] = (tagCounts[t] || 0) + 1;
}

const DATA = {
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    license: 'Factory License',
    scope: states.length + ' States/UTs with completed Expert Discussion; ' + states.filter(s => !s.fgdPending).length + ' also have Focused Group Discussion',
    sourcesNote: 'Every finding below is traced to the real ED transcript, FGD transcript, or a web-search-backed secondary-research pass for that State — nothing is invented. See Method & Data Quality.'
  },
  phases: PHASES,
  states,
  aggregates: {
    totalFindings, totalQuotes, totalGaps: allGaps.length, gapFlagCounts, tagCounts,
    goodPractices: by('GOOD_PRACTICE'), inconsistencies: by('INCONSISTENT'),
    secondaryResolved: by('SECONDARY_RESOLVED'), secondaryOpen: by('SECONDARY_OPEN'),
    missing: by('MISSING'), vague: by('VAGUE'), reforms: by('REFORM')
  }
};

const template = fs.readFileSync(path.join(__dirname, 'dashboard.template.html'), 'utf8');
const out = template.replace('/*__DATA__*/', JSON.stringify(DATA));
fs.writeFileSync(path.join(ROOT, 'cor-dashboard.html'), out);

console.log('Built cor-dashboard.html —', states.length, 'States,', totalFindings, 'findings,', totalQuotes, 'quotes,', allGaps.length, 'gaps.');
console.log('Gap flags:', JSON.stringify(gapFlagCounts));
