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
  // Confirmed directly from the HP Dept. of Labour & Employment's own OFRIS
  // "Procedure and Checklist" document (user-supplied PDF, Oct 2026) — this
  // is the URL it cites throughout, superseding an earlier unconfirmed guess.
  HP: 'https://admis.hp.nic.in/ofris',
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

// Exact checklists from the HP Dept. of Labour & Employment's own OFRIS
// "Procedure and Checklist" document (user-supplied PDF, Oct 2026) — far more
// granular than the ED's own vague "statutory documents required under
// departmental rules" estimate. HP_BPA_DOCS = Building Plan Approval
// checklist (19 items); HP_LICENSE_DOCS = Registration/grant-of-license
// checklist (11 items).
const HP_BPA_DOCS = [
  'Form No-1 (online e-form, web application only)',
  'Form No 1-A (online e-form, web application only)',
  'Questionnaire (online e-form, web application only)',
  'Flow-chart of manufacturing process',
  'Write-up chart of manufacturing process',
  "Resolution of the Board of Directors declaring one Director as occupier (or partners' resolution declaring one partner as occupier, or proprietor's declaration in a proprietorship)",
  'List of Directors/Partners, with parentage and complete residential addresses',
  'List of machinery',
  'Copy of power sanction certificate from the concerned authority (HPSEB)',
  'Site Plan of the factory',
  'Building drawings, including elevations, plans & cross sections',
  'Machine lay-out',
  'Certificate from the Registrar of Companies regarding incorporation (company)',
  'List of partners with parentage & complete residential address (partnership firm)',
  "Proprietor's name, parentage and complete residential address, via self-attested declaration (proprietorship)",
  'All documents signed by the occupier (Director/Partner/Proprietor, as applicable)',
  'All drawings signed by the occupier and by a Chartered Engineer/Chartered Architect',
  'Copy of approval from the Department of Industries (industrial unit) or Director Energy/HIMURJA/other competent authority (hydroelectric power project)',
  'Uploading of all documents is mandatory'
];
const HP_LICENSE_DOCS = [
  'Form No.3 (online e-form, web application only)',
  'Certificate of Stability, signed by a Chartered Engineer/Chartered Architect',
  "Board resolution declaring a Director as occupier (or partners' resolution declaring a partner as occupier, or proprietor's declaration)",
  'List of Directors/Partners, with parentage and complete residential addresses',
  'List of partners with parentage & complete residential address',
  "Proprietor's self-attested declaration of name, parentage and complete residential address (proprietorship)",
  'Certificate of incorporation from the Registrar of Companies (company)',
  'Copy of power sanction certificate from the concerned authority (HPSEB)',
  'NOC from the Chief Fire Officer',
  'NOC from the HP Pollution Control Board',
  'All documents signed by the occupier and uploaded'
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
  HP: { 2: 'HP_BPA_DOCS', 5: 'HP_LICENSE_DOCS' },
  JK: { 2: 'JK_DOCS' },
  JH: { 2: 'all' },
  MN: { 1: 'all' },
  NL: { 1: 'all' },
  TG: { 2: 'all' },
  UP: { 5: 'all' },
  WB: {} // not itemised in ED; nothing to attach
};

const NAMED_LISTS = { JK_DOCS, HP_BPA_DOCS, HP_LICENSE_DOCS };

data.STATES.forEach(s => {
  // bug fix: this used to write s.portalUrl, a field the frontend never reads
  // (it reads s.portal.url) — so every confirmed URL above was silently inert.
  if (PORTAL_URLS[s.code]) s.portal.url = PORTAL_URLS[s.code];
  const map = DOC_STEP_MAP[s.code] || {};
  Object.entries(map).forEach(([n, spec]) => {
    const step = s.steps.find(st => st.n === Number(n));
    if (!step) return;
    if (spec === 'all') step.documents = s.documents;
    else if (NAMED_LISTS[spec]) step.documents = NAMED_LISTS[spec];
    else step.documents = spec;
  });
  // keep the original source-granularity note visible alongside the richer lists
  if (s.code === 'JK') {
    s.documentsNote = (s.documentsNote || '') +
      ' Secondary research (the official Single Window procedure checklist) found 15 distinct items, more granular than this estimate — see the Application & documentation step for the full list.';
  }
  if (s.code === 'HP') {
    s.documentsNote = (s.documentsNote || '') +
      " The HP Dept. of Labour & Employment's own OFRIS \"Procedure and Checklist\" document (user-supplied) gives exact, separate checklists for Building Plan Approval (19 items) and License registration (11 items) — see those two steps below for the full lists, each more granular than this state's ED/FGD estimate.";
  }
});

fs.writeFileSync(path.join(__dirname, 'seed-data.enriched.json'), JSON.stringify(data, null, 2));
console.log('Enriched seed data written.');
