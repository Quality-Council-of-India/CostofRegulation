// One-time enrichment pass: attaches confirmed portal URLs and maps each
// state's document checklist onto the specific step where documents are
// actually submitted, instead of leaving it as a separate flat list with no
// connection to the process. Run once to produce seed-data.enriched.json;
// the seed script reads the enriched file.
const fs = require('fs');
const path = require('path');

const data = require('./seed-data.json');

const PORTAL_URLS = {
  AP: null, // "Single Desk Portal" named in ED; no government domain independently confirmed in secondary research
  CG: null, // online portal named generically; no confirmed domain
  DNHDD: 'https://swp.dddgov.in',
  HP: 'https://ofris.hp.gov.in',
  JK: 'https://singlewindow.jk.gov.in',
  JH: 'https://shramadhan.jharkhand.gov.in',
  MN: 'https://eodbmanipur.mn.gov.in',
  NL: null, // "single digital portal" named in ED; no confirmed domain
  TG: 'https://tsfactories.cgg.gov.in',
  UP: 'https://niveshmitra.up.gov.in',
  WB: 'https://silpasathi.wb.gov.in'
};

// Richer, officially-sourced document checklist for J&K found during secondary
// research (singlewindow.jk.gov.in procedure checklist + SOP, service id 21) -
// more granular than the ED's own "12-13 documents" estimate.
const JK_DOCS = [
  'Application on prescribed Form No. 1',
  'Form 2 & 3 (combined) — 1 copy, submitted every year',
  'Certificate of Consent to Establish/Operate from the J&K State Pollution Control Board (mandatory)',
  'NOC/License from the concerned department/authority — only for sawmills, wood-peeling units, explosives factories, arms & ammunition factories, drug/pharmaceutical factories, brick kilns, or stone crushers',
  'Authorization letter of the Manager, from the Occupier',
  'Copy of Power Sanction Certificate from the Power Development Department',
  'Safety Certificate (in duplicate), indicating safety measures adopted',
  'Passport-size photograph of the Manager or Occupier',
  'ID proof of the applicant (Aadhaar card / Ration card / Driving License)',
  'Land/tenure proof — one of: land records (ownership), Rent Deed (if rented), Allotment Letter (if in an industrial area), or Lease Deed (if leased)',
  'Copy of approval from the Department of Industries (DIC Registration)',
  'List of machinery, with sizes/specifications',
  'Flow chart of the manufacturing process',
  'Project report of the factory',
  'Site plan of the factory, signed by the Occupier, in triplicate'
];

// stepN (1-indexed) within each state's steps array that documents attach to.
// DNHDD splits across two real stages (plan approval vs. license registration).
const DOC_STEP_MAP = {
  AP: { 2: 'all' },
  CG: { 3: 'all' },
  DNHDD: {
    2: ['Structural drawings, site plans, manufacturing process flowcharts (for plan approval)'],
    5: ['Ownership/lease deed, list of directors, safety clearances (for licence registration)', 'A fixed 7-document checklist overall']
  },
  HP: { 2: 'all' },
  JK: { 2: 'JK_DOCS' },
  JH: { 2: 'all' },
  MN: { 1: 'all' },
  NL: { 1: 'all' },
  TG: { 2: 'all' },
  UP: { 5: 'all' },
  WB: {} // not itemised in ED; nothing to attach
};

data.STATES.forEach(s => {
  s.portalUrl = PORTAL_URLS[s.code] ?? null;
  const map = DOC_STEP_MAP[s.code] || {};
  Object.entries(map).forEach(([n, spec]) => {
    const step = s.steps.find(st => st.n === Number(n));
    if (!step) return;
    if (spec === 'all') step.documents = s.documents;
    else if (spec === 'JK_DOCS') step.documents = JK_DOCS;
    else step.documents = spec;
  });
  // keep the original source-granularity note visible alongside the richer JK list
  if (s.code === 'JK') {
    s.documentsNote = (s.documentsNote || '') +
      ' Secondary research (the official Single Window procedure checklist) found 15 distinct items, more granular than this estimate — see the Application & documentation step for the full list.';
  }
});

fs.writeFileSync(path.join(__dirname, 'seed-data.enriched.json'), JSON.stringify(data, null, 2));
console.log('Enriched seed data written.');
