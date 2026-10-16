/* ==========================================================================
   COST OF REGULATION — FACTORY LICENSE DASHBOARD (live app)
   Fetches structured data from the backend API; nothing is embedded/static.
   ========================================================================== */

const ICONS = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  columns:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="16" rx="1"/><rect x="16" y="4" width="5" height="16" rx="1"/>',
  layers:'<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  award:'<circle cx="12" cy="8" r="5.2"/><path d="M8.3 12.8 6.5 21l5.5-3 5.5 3-1.8-8.2"/>',
  scale:'<path d="M12 3v17"/><path d="M6 7h6M12 7h6"/><path d="M3 7l2.6 6.2a2.6 2.6 0 0 0 5.2 0L8 7"/><path d="M16 7l2.6 6.2a2.6 2.6 0 0 0 5.2 0L21 7"/><path d="M7 20h10"/>',
  book:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v17h4.5A2.5 2.5 0 0 1 20 21.5z"/>',
  flask:'<path d="M9 2v6.5L4 18a2 2 0 0 0 1.8 3h12.4a2 2 0 0 0 1.8-3L15 8.5V2"/><path d="M8.5 2h7"/><path d="M7 15h10"/>',
  download:'<path d="M12 3v12"/><path d="M6.5 10 12 15.5 17.5 10"/><path d="M4 19.5h16"/>',
  check:'<circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.3l3 3 6-6.6"/>',
  pin:'<path d="M12 21.5s7.2-7.6 7.2-12.3A7.2 7.2 0 0 0 4.8 9.2c0 4.7 7.2 12.3 7.2 12.3z"/><circle cx="12" cy="9" r="2.6"/>',
  alert:'<path d="M12 3 2.2 20h19.6z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/>',
  dash:'<circle cx="12" cy="12" r="9.5" stroke-dasharray="2.5 3"/>',
  arrow:'<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  link:'<path d="M9 15 15 9"/><path d="M10 6.5 11.5 5a4 4 0 0 1 5.7 5.7L15.5 12.2"/><path d="M14 17.5 12.5 19a4 4 0 0 1-5.7-5.7L8.5 11.8"/>',
  log:'<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/><circle cx="20" cy="18" r="2"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  refresh:'<path d="M3 11a9 9 0 0 1 15.3-5.6L21 8"/><path d="M21 3v5h-5"/><path d="M21 13a9 9 0 0 1-15.3 5.6L3 16"/><path d="M3 21v-5h5"/>'
};
function icon(name, cls){ return `<svg class="ic${cls?' '+cls:''}" viewBox="0 0 24 24">${ICONS[name]||''}</svg>`; }
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const API = {
  async get(path){ const r = await fetch('/api'+path, {credentials:'same-origin'}); if(!r.ok) throw new Error((await r.json().catch(()=>({message:r.statusText}))).message||r.statusText); return r.json(); },
  async post(path, body){ const r = await fetch('/api'+path, {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{})}); const data = await r.json().catch(()=>({})); if(!r.ok) throw Object.assign(new Error(data.message||data.error||r.statusText), {data}); return data; }
};

let STATES = [];
let AUTH = { isAdmin:false, username:null };
const ST_BY_CODE = {};
const DEEMED_LABEL = {yes:'Yes', no:'No', unclear:'Not confirmed'};
const STAGE_MAP = Object.fromEntries([
  ['pre','Pre-application / plan approval'],['apply','Application & documentation'],
  ['scrutiny','Scrutiny'],['inspect','Inspection'],['fee','Fee & payment'],
  ['approve','Approval & issuance'],['renew','Renewal / post-issuance']
].map(([k,n])=>[k,{k,n}]));
const STAGES = Object.values(STAGE_MAP);

const F = { view:'overview', state:null, phase:'apply', cmp:[], search:'', sort:{col:null,dir:1} };

/* ---------- toasts ---------- */
function toast(msg, type){
  const host = document.getElementById('toastHost');
  const el = document.createElement('div');
  el.className = 'toast' + (type?' '+type:'');
  el.innerHTML = (type==='success'?icon('check'):type==='error'?icon('alert'):'') + '<span>'+esc(msg)+'</span>';
  host.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 4200);
}

/* ---------- formatting helpers ---------- */
const fmtDays = t => { if(t.minDays==null) return 'Not specified'; if(t.minDays===t.maxDays) return t.minDays+' days'; return t.minDays+'–'+t.maxDays+' days'; };
function stepBadgeClass(step){
  if(step.automated===true) return 'online';
  if(step.automated==='partial') return 'mixed';
  if(step.automated===false) return step.phase==='inspect' ? 'site' : 'mixed';
  return 'unclear';
}
function stepBadgeLabel(step){
  if(step.automated===true) return 'Online';
  if(step.automated==='partial') return 'Partly online';
  if(step.automated===false) return step.phase==='inspect' ? 'On-site visit' : 'Manual';
  return 'Conditional';
}
function stepDot(step){ return `<div class="dot ${stepBadgeClass(step)}">${step.automated===true?icon('check'):(step.phase==='inspect'&&step.automated!==true)?icon('pin'):step.n}</div>`; }
function stepBadge(step){ const c=stepBadgeClass(step); return `<span class="badge b-${c==='online'?'online':c==='site'?'site':c==='mixed'?'mixed':'mute'}"><span class="dot"></span>${esc(stepBadgeLabel(step))}</span>`; }
function deemedBadge(d){
  if(d.status==='yes') return `<span class="badge b-online">${icon('check')}Deemed approval: Yes${d.days?(' · '+d.days+' days'):''}</span>`;
  if(d.status==='no') return `<span class="badge b-bad">${icon('alert')}Deemed approval: No</span>`;
  return `<span class="badge b-mute">${icon('dash')}Not confirmed</span>`;
}
function autoLevelTag(s){
  if(s._autoShare==null) return '<span class="tag t-mute">Not scoreable</span>';
  const pct = Math.round(s._autoShare*100);
  if(pct>=85) return `<span class="tag t-ok">${pct}% digitised</span>`;
  if(pct>=55) return `<span class="tag t-warn">${pct}% digitised</span>`;
  return `<span class="tag t-bad">${pct}% digitised</span>`;
}
function kpiIcon(cls,ic,l,v,s){ return `<div class="kpi ${cls}"><div class="k-top"><div class="k-l">${esc(l)}</div><div class="k-icon">${icon(ic)}</div></div><div class="k-v">${esc(v)}</div><div class="k-s">${esc(s)}</div></div>`; }
function hbars(items){
  const max = Math.max(1, ...items.map(i=>i.max||i.v||1));
  return '<div class="hbars">'+items.map((i)=>{
    const pct = i.v==null?0:Math.max(2, (i.v/max)*100);
    return `<div class="hbar"><div class="hb-n" ${i.code?`onclick="goState('${i.code}')"`:''}>${esc(i.n)}</div>`+
      `<div class="hb-track"><div class="hb-fill" data-w="${pct}" style="background:${i.col||'var(--primary)'}"></div></div>`+
      `<div class="hb-v">${esc(i.label)}</div></div>`;
  }).join('')+'</div>';
}
/* innerHTML-injected <script> tags never execute, so bar-fill animation is
   driven here instead: set width to 0 at paint, then to its real value one
   frame later so the CSS transition on .hb-fill actually animates. */
function animateBars(){
  document.querySelectorAll('.hb-fill[data-w]').forEach(el=>{ el.style.width = '0%'; });
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      document.querySelectorAll('.hb-fill[data-w]').forEach(el=>{ el.style.width = el.dataset.w + '%'; });
    });
  });
}
function portalLink(s){
  if(!s.portal.url) return `<span class="chip-sm" title="Portal name known from the Expert Discussion; URL not independently confirmed">${icon('pin')} ${esc(s.portal.name)}</span>`;
  return `<a class="chip-sm link" href="${esc(s.portal.url)}" target="_blank" rel="noopener">${icon('link')} ${esc(s.portal.name)}</a>`;
}

/* ---------- nav ---------- */
const NAV = [
  {k:'overview', icon:'grid', t:'National overview', d:'Factory License across all 11 States/UTs'},
  {k:'state', icon:'user', t:'State profile', d:'Combined ED / FGD / secondary findings per step'},
  {k:'compare', icon:'columns', t:'Compare States', d:'Line up 2–4 States side by side'},
  {k:'phase', icon:'layers', t:'Stage comparison', d:'One process stage, across every State'},
  {k:'best', icon:'award', t:'Best practices', d:'Who is doing which step best, and why'},
  {k:'reconcile', icon:'scale', t:'Official vs. lived experience', d:'Every logged ED–FGD contradiction'},
  {k:'research', icon:'flask', t:'Research log', d:'Every secondary-research run, live'},
  {k:'method', icon:'book', t:'Method & data quality', d:'CoR 2.0 framework, sources, open gaps'}
];
function buildNav(){
  document.getElementById('railnav').innerHTML = NAV.map(n=>
    `<button class="navbtn" data-view="${n.k}" onclick="goView('${n.k}')">${icon(n.icon)}<span><span class="t">${esc(n.t)}</span><span class="d">${esc(n.d)}</span></span></button>`
  ).join('');
}
function goView(v){ F.view=v; render(); }
function goState(code){ F.state=code; F.view='state'; render(); }

function buildRailAdmin(){
  const host = document.getElementById('railAdmin');
  if(AUTH.isAdmin){
    host.innerHTML = `<div class="admin-pill"><span class="av">${esc((AUTH.username||'A')[0].toUpperCase())}</span> Signed in as <b>${esc(AUTH.username)}</b></div>
      <button class="btn sm" onclick="logout()">${icon('lock')} Sign out</button>`;
  } else {
    host.innerHTML = `<button class="btn sm" onclick="openLogin()">${icon('lock')} Admin sign-in</button>`;
  }
}
function openLogin(){ document.getElementById('loginBackdrop').hidden = false; document.getElementById('loginError').hidden = true; }
function closeLogin(){ document.getElementById('loginBackdrop').hidden = true; }
async function logout(){ await API.post('/auth/logout'); AUTH = {isAdmin:false, username:null}; buildRailAdmin(); toast('Signed out'); render(); }

function buildFilters(){
  const bar = document.getElementById('filterbar');
  if(F.view==='state'){
    bar.innerHTML = `<div class="fld"><label>State / UT</label><select id="selState">${STATES.map(s=>`<option value="${s.code}" ${F.state===s.code?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="fld"><label>&nbsp;</label><div style="display:flex;gap:6px"><button class="btn sm" id="prevSt">← Prev</button><button class="btn sm" id="nextSt">Next →</button></div></div>`;
    document.getElementById('selState').onchange = e=>{ F.state=e.target.value; render(); };
    document.getElementById('prevSt').onclick = ()=>{ const i=STATES.findIndex(s=>s.code===F.state); F.state=STATES[(i-1+STATES.length)%STATES.length].code; render(); };
    document.getElementById('nextSt').onclick = ()=>{ const i=STATES.findIndex(s=>s.code===F.state); F.state=STATES[(i+1)%STATES.length].code; render(); };
  } else if(F.view==='phase'){
    bar.innerHTML = `<div class="fld"><label>Process stage</label><select id="selPhase">${STAGES.map(p=>`<option value="${p.k}" ${F.phase===p.k?'selected':''}>${esc(p.n)}</option>`).join('')}</select></div>`;
    document.getElementById('selPhase').onchange = e=>{ F.phase=e.target.value; render(); };
  } else {
    bar.innerHTML = `<div class="fld"><label>Pilot service</label><select disabled><option>Factory License</option></select></div>
      <div class="fld"><label>Coverage</label><select disabled><option>11 of 36 States/UTs (ED complete)</option></select></div>`;
  }
}

/* ========================= VIEWS ========================= */

function renderOverview(){
  const withDeemed = STATES.filter(s=>s.deemedApproval.status==='yes').length;
  const withFGD = STATES.filter(s=>!s.fgdPending).length;
  const withSecondary = STATES.filter(s=>!s.secondary.pending).length;
  const timed = STATES.filter(s=>s._timeMid!=null);
  const fastest = timed.slice().sort((a,b)=>a._timeMid-b._timeMid)[0];
  const slowest = timed.slice().sort((a,b)=>b._timeMid-a._timeMid)[0];
  const q = F.search.trim().toLowerCase();
  const filtered = q ? STATES.filter(s=>s.name.toLowerCase().includes(q)) : STATES;

  let h = `<div class="pagehead"><div><h2>${icon('grid')}Factory License — national overview</h2>
    <div class="lede">Every figure below combines the official Expert Discussion, business-experience (FGD) and secondary-research record — open a State to see the full three-way reconciliation.</div></div>
    <span class="stamp live">${withSecondary} of 11 secondary-research verified</span></div>`;

  h += `<div class="banner info">${icon('alert')}<span><b>Reading this pilot.</b> This is a process-comparison tool (steps, timeline, automation, documents, deemed approval), not yet the full CoR 2.0 cost survey. Cost figures shown anywhere are informal numbers volunteered in discussions, not survey output.</span></div>`;

  h += `<div class="grid g4" style="margin-bottom:16px">
    ${kpiIcon('acc-primary','grid','States covered','11 / 36','Factory License · ED complete')}
    ${kpiIcon('acc-success','flask','Secondary-research verified', withSecondary+' of 11', withSecondary<11?'click "Run secondary research" on any pending State':'all States independently verified')}
    ${kpiIcon('acc-warn','check','Deemed approval confirmed', withDeemed+' of 11', (11-withDeemed)+' report none, unclear, or untriggered in practice')}
    ${kpiIcon('acc-danger','alert','Open data gaps', STATES.reduce((a,s)=>a+s.dataGaps.length,0)+' fields', 'left blank, not estimated')}
  </div>`;

  h += `<div class="grid g23" style="margin-bottom:16px">
    <div class="card hoverable"><div class="card-h"><h3>Overall timeline, by State</h3><span class="note">statutory/prescribed, where stated</span></div><div class="card-b">
    ${hbars(STATES.map(s=>({n:s.name+' ('+s.code+')', code:s.code, v:s._timeMid, max:65, label: s._timeMid!=null?fmtDays(s.timeline):'not specified', col: s._timeMid==null?'#C3CBD4':(s._timeMid<=15?'var(--success)':s._timeMid<=35?'var(--warning)':'var(--danger)')})))}
    <div class="hint">Fastest: <b>${fastest?esc(fastest.name)+' ('+fmtDays(fastest.timeline)+')':'—'}</b>. Slowest: <b>${slowest?esc(slowest.name)+' ('+fmtDays(slowest.timeline)+')':'—'}</b>.</div>
    </div></div>
    <div class="card hoverable"><div class="card-h"><h3>Digitisation of application &amp; scrutiny</h3><span class="note">excludes site inspection, a safety step not a process gap</span></div><div class="card-b">
    ${hbars(STATES.map(s=>({n:s.name+' ('+s.code+')', code:s.code, v:s._autoShare==null?0:Math.round(s._autoShare*100), max:100, label:s._autoShare==null?'n/a':Math.round(s._autoShare*100)+'%', col:'var(--primary)'})))}
    </div></div>
  </div>`;

  const sortCol = F.sort.col, sortDir = F.sort.dir;
  const sorters = {
    name:s=>s.name, steps:s=>s._stepCount, timeline:s=>s._timeMid??9999, auto:s=>s._autoShare??-1, deemed:s=>s.deemedApproval.status
  };
  let rows = filtered.slice();
  if(sortCol) rows.sort((a,b)=> (sorters[sortCol](a) > sorters[sortCol](b) ? 1 : -1) * sortDir);

  const th = (col,label,extra) => `<th onclick="sortBy('${col}')">${esc(label)}${sortCol===col?`<span class="sort-arrow">${sortDir===1?'▲':'▼'}</span>`:''}${extra||''}</th>`;

  h += `<div class="card"><div class="card-h"><h3>State-by-state comparison — Factory License</h3>
    <span class="note">click a column to sort · click a row for the full profile</span></div>
    <div class="card-b tight"><div class="scroll-y"><table class="dt"><thead><tr>
    ${th('name','State / UT')}${th('steps','Steps')}${th('timeline','Timeline')}${th('auto','Digitisation')}${th('deemed','Deemed approval')}
    </tr></thead><tbody>`+
    rows.map(s=>`<tr>
      <td class="state-link" onclick="goState('${s.code}')">${esc(s.name)}${s.dataGaps.length?' '+icon('alert'):''}${!s.fgdPending?' '+icon('user'):''}${!s.secondary.pending?' '+icon('flask'):''}
      <small>${esc(s.ed.date)} · ${esc(s.ed.designation.split(',')[0])}</small></td>
      <td class="n">${s._stepCount}</td><td>${fmtDays(s.timeline)}</td><td>${autoLevelTag(s)}</td><td>${deemedBadge(s.deemedApproval)}</td>
    </tr>`).join('')+
    '</tbody></table></div></div></div>';

  return h;
}
function sortBy(col){
  if(F.sort.col===col) F.sort.dir *= -1; else { F.sort.col = col; F.sort.dir = 1; }
  render();
}

function sourceBanner(s){
  const parts = [];
  parts.push(`<span class="chip-sm">${icon('book')} ED: ${esc(s.ed.date)}</span>`);
  parts.push(s.fgdPending ? `<span class="chip-sm">${icon('user')} FGD: pending</span>` : `<span class="chip-sm">${icon('user')} FGD: ${esc(s.fgd.meta.split('·')[0]).trim()}</span>`);
  parts.push(s.secondary.pending ? `<span class="chip-sm">${icon('flask')} Secondary: not yet run</span>` : `<span class="chip-sm">${icon('flask')} Secondary: verified</span>`);
  return parts.join(' ');
}

function renderState(){
  const s = ST_BY_CODE[F.state];
  if(!s) return '<div class="empty"><b>Pick a State</b></div>';
  let h = `<div class="pagehead"><div><h2>${icon('user')}${esc(s.name)}</h2>
    <div class="lede">${esc(s.issuingAuthority)}</div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${sourceBanner(s)} ${portalLink(s)}</div></div>
    <div>
      <span class="stamp live">ED: ${esc(s.ed.date)}</span><br>
      <button class="btn sm primary" style="margin-top:8px" onclick="triggerResearch('${s.code}')" id="researchBtn-${s.code}">${icon('refresh')} Run secondary research</button>
    </div></div>`;

  if(s.dataGaps.length){
    h += `<div class="banner">${icon('alert')}<span><b>Flagged data gaps for ${esc(s.name)}.</b> ${s.dataGaps.map(esc).join(' · ')}</span></div>`;
  }

  const bd = {online:s.steps.filter(x=>x.automated===true).length, site:s.steps.filter(x=>x.phase==='inspect').length};
  const nonInspectCount = s.steps.filter(x=>x.phase!=='inspect').length;
  h += `<div class="grid g4" style="margin-bottom:16px">
    ${kpiIcon('acc-primary','layers','Steps recorded', String(s._stepCount), 'exactly as the Expert Discussion describes them')}
    ${kpiIcon(s._timeMid==null?'acc-warn':'acc-success','grid','Timeline', fmtDays(s.timeline), s.timeline.basis||'')}
    ${kpiIcon('acc-primary','check','Digitisation', s._autoShare==null?'n/a':Math.round(s._autoShare*100)+'%', bd.online+' of '+nonInspectCount+' non-inspection steps online'+(s._hasInspection?' · '+bd.site+' on-site visit':''))}
    ${kpiIcon(s.deemedApproval.status==='yes'?'acc-success':'acc-danger','award','Deemed approval', DEEMED_LABEL[s.deemedApproval.status], s.deemedApproval.days?(s.deemedApproval.days+' days'):'')}
  </div>`;

  h += `<div class="gap-note" style="margin-bottom:16px">${icon('dash')} <b>On step granularity:</b> the ${s._stepCount} steps below are exactly what ${esc(s.ed.expert)} (${esc(s.ed.designation)}) described in the Expert Discussion. Each step below already combines the official record with any business-experience (FGD) or secondary-research finding that maps to it, plus the documents actually required at that step and a link to the portal where available.</div>`;

  h += `<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>${icon('layers')}Combined process — official record + documents</h3>
    <span class="note">${esc(s.ed.expert)}, ${esc(s.ed.designation)} · ${esc(s.ed.location)}</span></div>
    <div class="card-b"><div class="stepper">`+
    s.steps.map(st=>`<div class="step-v"><div class="rail-col">${stepDot(st)}<div class="line"></div></div>
      <div class="body"><div class="sp">${esc(STAGE_MAP[st.phase]?.n||st.phase)}</div>
      <div class="st">${esc(st.title)}${stepBadge(st)}</div>
      ${st.note?`<div class="sd">${esc(st.note)}</div>`:''}
      ${st.documents&&st.documents.length?`<div class="step-docs"><b>Documents required here</b><ul>${st.documents.map(d=>`<li>${esc(d)}</li>`).join('')}</ul></div>`:''}
      </div></div>`).join('')+
    '</div></div></div>';

  h += `<div class="grid g3" style="margin-bottom:16px">
    <div class="card"><div class="card-h"><h3>Fees &amp; validity</h3></div><div class="card-b" style="font-size:12.5px;color:var(--muted);line-height:1.6">
      <b style="color:var(--ink)">Fees</b><br>${esc(s.fees.text)}<br><br><b style="color:var(--ink)">Validity</b><br>${esc(s.validity.text)}</div></div>
    <div class="card"><div class="card-h"><h3>Deemed approval</h3></div><div class="card-b" style="font-size:12.5px;color:var(--muted);line-height:1.6">${deemedBadge(s.deemedApproval)}<div style="margin-top:9px">${esc(s.deemedApproval.text)}</div></div></div>
    <div class="card"><div class="card-h"><h3>Documents not tied to one step</h3></div><div class="card-b" style="font-size:12.5px;color:var(--muted);line-height:1.6">${s.documentsNote?esc(s.documentsNote):'All documents found are shown against the step above where they are submitted.'}</div></div>
  </div>`;

  if(s.remarks.length){
    h += `<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Official's remarks &amp; recommendations</h3></div><div class="card-b">
      <ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--muted);line-height:1.7">${s.remarks.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></div></div>`;
  }

  h += `<div class="card-h" style="background:transparent;border:0;padding:4px 0 10px"><h3 style="font-size:17px"><span style="font-family:var(--display);font-weight:700">Three sources, reconciled</span></h3></div>`;
  h += '<div class="grid g3" style="margin-bottom:16px;align-items:stretch">';
  h += `<div class="src-card ed"><div class="src-h">${icon('book')}Official record (ED)</div><div class="src-b">Baseline record of the process, as the official described it.<br><br><b>Timeline:</b> ${esc(fmtDays(s.timeline))}<br><b>Deemed approval:</b> ${esc(DEEMED_LABEL[s.deemedApproval.status])}</div>
    <div class="src-meta">${esc(s.ed.expert)} · ${esc(s.ed.date)}</div></div>`;
  if(s.fgdPending){
    h += `<div class="src-card fgd"><div class="src-h">${icon('user')}Business experience (FGD)</div><div class="src-b"><div class="empty" style="padding:10px 0"><b>Not yet conducted</b>No FGD has been held in ${esc(s.name)} for Factory License yet.</div></div></div>`;
  } else {
    const f = s.fgd;
    h += `<div class="src-card fgd"><div class="src-h">${icon('user')}Business experience (FGD)</div><div class="src-b">${esc(f.process.slice(0,260))}${f.process.length>260?'…':''}</div><div class="src-meta">${esc(f.meta)}</div></div>`;
  }
  if(s.secondary.pending){
    h += `<div class="src-card sec"><div class="src-h">${icon('flask')}Secondary research</div><div class="src-b"><div class="empty" style="padding:10px 0"><b>Not yet run</b>${AUTH.isAdmin?`Click "Run secondary research" above to verify this State against official rules and portals.`:'An admin can trigger a fresh research pass from this page.'}</div></div></div>`;
  } else {
    h += `<div class="src-card sec"><div class="src-h">${icon('flask')}Secondary research</div><div class="src-b">${esc(s.secondary.notes)}</div><div class="src-meta">${s.secondary.sources.map(esc).join(' · ')}</div></div>`;
  }
  h += '</div>';

  if(!s.fgdPending){
    h += `<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Business/user experience — full account</h3><span class="note">${esc(s.fgd.meta)}</span></div><div class="card-b">
      <div class="grid g2" style="margin-bottom:13px">
      <div><b>What applicants say actually happens</b><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.55">${esc(s.fgd.process)}</div></div>
      <div><b>Automation, as experienced</b><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.55">${esc(s.fgd.automation)}</div></div>
      </div>
      <div style="margin-bottom:13px"><b>Costs volunteered in discussion</b><table class="dt" style="margin-top:7px"><thead><tr><th>Cost type</th><th>What participants said</th></tr></thead><tbody>${s.fgd.costs.map(c=>`<tr><td style="white-space:nowrap;font-weight:700">${esc(c[0])}</td><td style="color:var(--muted)">${esc(c[1])}</td></tr>`).join('')}</tbody></table></div>
      <div><b>Complaints &amp; suggestions</b><ul style="margin:7px 0 0;padding-left:18px;font-size:12.5px;color:var(--muted);line-height:1.65">${s.fgd.complaints.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></div>
      </div></div>`;
  }

  if(!s.secondary.pending){
    const sec = s.secondary;
    h += `<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>${icon('flask')}Secondary research — full account</h3><span class="note">independent verification against official rules, notifications &amp; portals</span></div><div class="card-b">
      ${sec.confirms.length?`<div style="margin-bottom:13px"><b style="color:var(--success)">Confirms the official record</b><ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px;color:var(--muted);line-height:1.65">${sec.confirms.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></div>`:''}
      ${sec.contradicts.length?`<div style="margin-bottom:13px"><b style="color:var(--danger)">Contradicts or complicates the official record</b><ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px;color:var(--muted);line-height:1.65">${sec.contradicts.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></div>`:''}
      ${sec.newDetail.length?`<div><b style="color:var(--ink)">Adds new detail</b><ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px;color:var(--muted);line-height:1.65">${sec.newDetail.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></div>`:''}
      <div class="hint">Sources: ${sec.sources.map(esc).join(' · ')}</div>
      </div></div>`;
  }

  const disagreements = [];
  if(!s.fgdPending) s.fgd.contradictions.forEach(c=>disagreements.push({src:'Business experience vs. official record', text:c}));
  if(!s.secondary.pending) s.secondary.contradicts.forEach(c=>disagreements.push({src:'Secondary research vs. official record', text:c}));
  if(disagreements.length){
    h += `<div class="card"><div class="card-h"><h3>${icon('scale')}Where the sources disagree</h3></div><div class="card-b">${disagreements.map(d=>`<div class="contra">${icon('alert')}<span><b>${esc(d.src)}.</b> ${esc(d.text)}</span></div>`).join('')}</div></div>`;
  } else if(!s.fgdPending || !s.secondary.pending){
    h += `<div class="confirm">${icon('check')}<span>No disagreements logged between the sources gathered so far for ${esc(s.name)}.</span></div>`;
  }

  return h;
}

async function triggerResearch(code){
  if(!AUTH.isAdmin){ openLogin(); toast('Sign in as admin to trigger research'); return; }
  const btn = document.getElementById('researchBtn-'+code);
  if(btn){ btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Researching…'; }
  try {
    const { runId } = await API.post('/research/trigger', { stateCode: code, licenseCode: 'FL' });
    toast('Secondary research started for '+ST_BY_CODE[code].name, 'success');
    pollRun(runId, code);
  } catch(e){
    toast('Could not start research: '+e.message, 'error');
    if(btn){ btn.disabled = false; btn.innerHTML = icon('refresh')+' Run secondary research'; }
  }
}
async function pollRun(runId, code){
  const poll = async () => {
    try {
      const run = await API.get('/research/runs/'+runId);
      if(run.status==='running'){ setTimeout(poll, 3000); return; }
      const btn = document.getElementById('researchBtn-'+code);
      if(run.status==='done'){
        toast('Secondary research complete for '+(ST_BY_CODE[code]?.name||code), 'success');
        await loadStates();
        if(F.view==='state' && F.state===code) render();
        if(F.view==='research') render();
      } else {
        toast('Research run failed: '+(run.error||'unknown error'), 'error');
        if(btn){ btn.disabled=false; btn.innerHTML = icon('refresh')+' Run secondary research'; }
      }
    } catch(e){ /* state may have changed view; stop polling silently */ }
  };
  setTimeout(poll, 2500);
}

function renderCompare(){
  let h = `<div class="pagehead"><div><h2>${icon('columns')}Compare States</h2><div class="lede">Pick 2 to 4 States/UTs to line up side by side.</div></div></div>`;
  h += `<div class="card" style="margin-bottom:16px"><div class="card-b"><div class="statepick">${STATES.map(s=>`<button class="${F.cmp.includes(s.code)?'on':''}" onclick="toggleCmp('${s.code}')">${esc(s.name)} <span class="n">${s.code}</span></button>`).join('')}</div><div class="hint">Select up to 4. Selecting a 5th replaces the first pick.</div></div></div>`;
  const chosen = F.cmp.map(c=>ST_BY_CODE[c]).filter(Boolean);
  if(chosen.length<2) return h+'<div class="empty"><b>Pick at least two States</b></div>';
  h += `<div class="grid" style="grid-template-columns:repeat(${chosen.length},minmax(0,1fr));margin-bottom:16px">`+
    chosen.map(s=>`<div class="cmp-col"><div class="cc-h"><div class="n">${esc(s.name)}</div><div class="s">${esc(s.ed.date)}</div></div>
      <div class="cmp-row"><div class="l">Steps</div>${s._stepCount}</div>
      <div class="cmp-row"><div class="l">Timeline</div>${fmtDays(s.timeline)}</div>
      <div class="cmp-row"><div class="l">Digitisation</div>${autoLevelTag(s)}</div>
      <div class="cmp-row"><div class="l">Deemed approval</div>${deemedBadge(s.deemedApproval)}</div>
      <div class="cmp-row"><div class="l">Portal</div>${portalLink(s)}</div>
      <div class="cmp-row" style="border-bottom:0"><div class="l">Sources</div>${sourceBanner(s)}</div>
      </div>`).join('')+'</div>';
  h += `<div class="card"><div class="card-h"><h3>Process, side by side</h3></div><div class="card-b tight">
    <div class="grid" style="grid-template-columns:repeat(${chosen.length},minmax(0,1fr))">`+
    chosen.map(s=>`<div style="padding:11px 13px;border-right:1px solid var(--border-2)"><div style="font-weight:700;font-size:12.5px;margin-bottom:9px;cursor:pointer" onclick="goState('${s.code}')">${esc(s.name)}</div><div class="stepper">`+
      s.steps.map(st=>`<div class="step-v"><div class="rail-col">${stepDot(st)}<div class="line"></div></div><div class="body" style="padding-bottom:16px"><div class="sp">${esc(STAGE_MAP[st.phase]?.n||st.phase)}</div><div class="st" style="font-size:12px">${esc(st.title)}</div></div></div>`).join('')+
      '</div></div>').join('')+'</div></div></div>';
  return h;
}
function toggleCmp(code){ const i=F.cmp.indexOf(code); if(i>=0) F.cmp.splice(i,1); else { if(F.cmp.length>=4) F.cmp.shift(); F.cmp.push(code); } render(); }

/* ---------- stage comparison v2 — more visual + more granular ---------- */
function renderPhase(){
  const stage = STAGE_MAP[F.phase];
  let h = `<div class="pagehead"><div><h2>${icon('layers')}Stage comparison — ${esc(stage.n)}</h2>
    <div class="lede">Each State's full process, with this stage highlighted — hover a card for documents and a portal link, not just a label.</div></div></div>`;

  const withStep = STATES.map(s=>({s, steps:s.steps.filter(x=>x.phase===F.phase)})).filter(x=>x.steps.length);
  const groups = {online:[], mixed:[], site:[]};
  withStep.forEach(({s,steps})=>{
    steps.forEach(st=>{
      const c = stepBadgeClass(st);
      groups[c==='online'?'online':c==='site'?'site':'mixed'].push({s, st});
    });
  });
  const total = groups.online.length+groups.mixed.length+groups.site.length;
  if(total){
    h += `<div class="card" style="margin-bottom:16px"><div class="card-b"><div class="hbars">
      <div class="hbar" style="grid-template-columns:150px 1fr 50px"><div class="hb-n">Fully online</div><div class="hb-track"><div class="hb-fill" style="width:${groups.online.length/total*100}%;background:var(--success)"></div></div><div class="hb-v">${groups.online.length}</div></div>
      <div class="hbar" style="grid-template-columns:150px 1fr 50px"><div class="hb-n">Partly online</div><div class="hb-track"><div class="hb-fill" style="width:${groups.mixed.length/total*100}%;background:var(--warning)"></div></div><div class="hb-v">${groups.mixed.length}</div></div>
      <div class="hbar" style="grid-template-columns:150px 1fr 50px"><div class="hb-n">On-site visit</div><div class="hb-track"><div class="hb-fill" style="width:${groups.site.length/total*100}%;background:var(--info)"></div></div><div class="hb-v">${groups.site.length}</div></div>
      </div></div></div>`;
  }

  const col = (cls,label,items) => {
    let c = `<div class="stagecol"><div class="stagecol-h ${cls}">${icon(cls==='online'?'check':cls==='site'?'pin':'dash')}${label} (${items.length})</div>`;
    if(!items.length) c += '<div class="hint">No States recorded here.</div>';
    items.forEach(({s,st})=>{
      const pipe = s.steps.map(x=>{
        const xc = stepBadgeClass(x);
        const dotCls = xc==='online'?'on':xc==='site'?'site':xc==='mixed'?'mixed':'';
        return `<span class="md ${dotCls} ${x.n===st.n?'focus':''}" title="${esc(x.title)}"></span>`;
      }).join('');
      c += `<div class="statecard-mini" onclick="goState('${s.code}')">
        <div class="n">${esc(s.name)} <span class="pos">step ${st.n} of ${s._stepCount}</span></div>
        <div class="d"><b>${esc(st.title)}.</b> ${esc(st.note||'')}</div>
        <div class="mini-pipe">${pipe}</div>
        <div class="meta-row">
          ${st.documents&&st.documents.length?`<span class="chip-sm">${icon('layers')} ${st.documents.length} document${st.documents.length===1?'':'s'}</span>`:''}
          ${portalLink(s)}
        </div>
      </div>`;
    });
    c += '</div>';
    return c;
  };

  h += `<div class="stagegrid">${col('online','Fully online', groups.online)}${col('mixed','Partly online / manual', groups.mixed)}${col('site','On-site visit (by design)', groups.site)}</div>`;

  const missing = STATES.filter(s=>!s.steps.some(x=>x.phase===F.phase));
  if(missing.length) h += `<div class="gap-note" style="margin-top:16px">${icon('dash')} No step was tagged to this stage for: ${missing.map(s=>esc(s.name)).join(', ')}.</div>`;
  h += `<div class="hint" style="margin-top:11px">Stage tags are our own grouping of each State's recorded steps for comparability — not a field present in the Expert Discussion documents themselves. The small dot row on each card is that State's full process; the larger outlined dot marks where this stage sits in it.</div>`;
  return h;
}

function renderBest(){
  let h = `<div class="pagehead"><div><h2>${icon('award')}Best practices across States</h2><div class="lede">Who leads on each KPI, and specific practices worth replicating — sourced from the ED/FGD/secondary record, not a composite score.</div></div></div>`;
  const timed = STATES.filter(s=>s._timeMid!=null).sort((a,b)=>a._timeMid-b._timeMid);
  const autod = STATES.filter(s=>s._autoShare!=null).sort((a,b)=>b._autoShare-a._autoShare);
  const deemedWorks = ST_BY_CODE['DNHDD'];
  const leaderCard = (kpi,s,metric,why) => `<div class="leader-card"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div class="lc-kpi">${esc(kpi)}</div><div class="medal">${icon('award')}</div></div><div class="lc-state" onclick="goState('${s.code}')">${esc(s.name)}</div><div class="lc-metric">${esc(metric)}</div><div class="lc-why">${esc(why)}</div></div>`;
  h += `<div class="grid g3" style="margin-bottom:18px">
    ${leaderCard('Fastest timeline', timed[0], fmtDays(timed[0].timeline), 'The only State in single digits to low teens for the full process, on the official\'s own account.')}
    ${leaderCard('Most digitised (excl. inspection)', autod[0], Math.round(autod[0]._autoShare*100)+'% of non-inspection steps online', 'Every non-inspection step in the recorded process runs through the portal.')}
    ${deemedWorks?leaderCard('Deemed approval that actually works', deemedWorks, '25-day rule, confirmed by businesses', 'The only State/UT where the FGD independently corroborates the official deemed-approval claim.'):''}
  </div>`;
  const practices = [
    {state:'Telangana', icon:'arrow', t:'Carry data forward between related approvals', d:'TS-iPASS reuses the applicant\'s Consent-to-Establish data and credentials for the Factory License stage.'},
    {state:'Jharkhand', icon:'layers', t:'One platform for the full licence lifecycle', d:'Shramadhan covers registration, licensing, renewal, amendment, inspection, fee and status in one platform.'},
    {state:'Dadra & Nagar Haveli and Daman & Diu', icon:'check', t:'A deemed-approval clock that genuinely pauses and resumes', d:'The 25-day rule pauses only for a genuine query and resumes promptly on response.'},
    {state:'Andhra Pradesh', icon:'book', t:'Public inspection transparency', d:'Inspection findings are published via the Central Inspection System portal.'},
    {state:'Telangana', icon:'alert', t:'A monetary penalty on officers who delay applications', d:'An accountability measure alongside self-certification and deemed approval.'},
    {state:'Himachal Pradesh', icon:'check', t:'Documentation genuinely trimmed under EoDB reform', d:'Fire NOC and Pollution NOC are explicitly not required unless specifically needed under other laws.'},
    {state:'Nagaland', icon:'user', t:'A minimal, low-friction document checklist', d:'Only plant layout, GPS location and occupier/manager ID — PAN and Aadhaar not insisted upon.'}
  ];
  h += `<div class="card"><div class="card-h"><h3>Specific practices worth replicating</h3></div><div class="card-b"><div class="grid g2">${practices.map(p=>`<div class="practice-card"><div class="pc-icon">${icon(p.icon)}</div><div class="pc-b"><div class="pc-state">${esc(p.state)}</div><div class="pc-t">${esc(p.t)}</div><div class="pc-d">${esc(p.d)}</div></div></div>`).join('')}</div></div></div>`;
  return h;
}

function renderReconcile(){
  const withFGD = STATES.filter(s=>!s.fgdPending);
  const allContra = [];
  withFGD.forEach(s=> s.fgd.contradictions.forEach(c=> allContra.push({state:s, text:c})) );
  let h = `<div class="pagehead"><div><h2>${icon('scale')}Official record vs. lived experience</h2><div class="lede">A dedicated, project-wide log of every point where the official account and business experience disagree.</div></div></div>`;
  h += `<div class="grid g4" style="margin-bottom:16px">
    ${kpiIcon('acc-primary','user','States with both ED and FGD', withFGD.length+' of 11','')}
    ${kpiIcon('acc-danger','alert','Contradictions logged', String(allContra.length), 'official account vs. business experience')}
    ${kpiIcon('acc-success','check','States where FGD confirms ED', '1 · DNH & DD', '')}
    ${kpiIcon('acc-warn','dash','FGD still pending', (11-withFGD.length)+' of 11', '')}
  </div>`;
  h += `<div class="card"><div class="card-h"><h3>Logged contradictions, by State</h3></div><div class="card-b">`+
    withFGD.map(s=>{
      const good = s.code==='DNHDD';
      return `<div style="margin-bottom:18px"><div style="font-weight:700;font-size:13px;margin-bottom:8px;cursor:pointer;color:var(--ink)" onclick="goState('${s.code}')">${esc(s.name)}</div>`+
        (good ? `<div class="confirm">${icon('check')}<span><b>Largely confirmed.</b> ${esc(s.fgd.contradictions[0])}</span></div>`
              : s.fgd.contradictions.map(c=>`<div class="contra">${icon('alert')}<span>${esc(c)}</span></div>`).join(''));
    }).join('')+'</div></div>';
  return h;
}

function renderResearchLogView(){
  let h = `<div class="pagehead"><div><h2>${icon('flask')}Secondary-research log</h2><div class="lede">Every research run, triggered by an admin, with status and full findings — this is where the model's work on this project is visible in full.</div></div></div>`;
  h += `<div id="researchLogBody"><div class="loading">Loading…</div></div>`;
  loadResearchLog();
  return h;
}
async function loadResearchLog(){
  try {
    const runs = await API.get('/research/runs?license=FL&limit=100');
    const host = document.getElementById('researchLogBody');
    if(!host) return;
    if(!runs.length){ host.innerHTML = `<div class="empty"><b>No research runs yet</b>${AUTH.isAdmin?'Open a State profile and click "Run secondary research" to start one.':'Sign in as admin to trigger one.'}</div>`; return; }
    host.innerHTML = `<div class="card"><div class="card-b" style="padding:0">`+
      runs.map(r=>`<div class="run-row">
        <div class="run-status ${r.status}"></div>
        <div class="run-body">
          <div class="run-top"><div class="run-title">${esc(ST_BY_CODE[r.state_code]?.name||r.state_code)} · ${esc(r.status)}</div><div class="run-time">${esc(r.triggered_at)} UTC · by ${esc(r.triggered_by)}</div></div>
          ${r.summary?`<div class="run-summary">${esc(r.summary)}</div>`:''}
          ${r.error?`<div class="run-error">${icon('alert')} ${esc(r.error)}</div>`:''}
          ${r.parsed?`<div class="hint">${(r.parsed.confirms||[]).length} confirmed · ${(r.parsed.contradicts||[]).length} contradicted · ${(r.parsed.newDetail||[]).length} new detail · ${(r.sources||[]).length} sources</div>`:''}
        </div>
      </div>`).join('')+
      `</div></div>`;
  } catch(e){ const host = document.getElementById('researchLogBody'); if(host) host.innerHTML = `<div class="empty"><b>Could not load the research log</b>${esc(e.message)}</div>`; }
}

function renderMethod(){
  let h = `<div class="pagehead"><div><h2>${icon('book')}Method &amp; data quality</h2><div class="lede">What this dashboard is built from, how it scales, and what is not yet known.</div></div></div>`;
  h += `<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Where this pilot sits in the CoR project</h3></div><div class="card-b" style="font-size:12.5px;color:var(--muted);line-height:1.7">
    <p>The CoR project runs in four stages: <b style="color:var(--ink)">Stage 1</b> — field survey, Expert Discussion (ED) and Focused Group Discussion (FGD) data gathering; <b style="color:var(--ink)">Stage 2</b> — structuring the ED/FGD record; <b style="color:var(--ink)">Stage 3</b> — secondary research against each State's own rules and portals, now triggerable on demand from any State profile by a signed-in admin, with every run logged in the Research Log tab; <b style="color:var(--ink)">Stage 4</b> — presenting the combined findings (this dashboard).</p>
    <p>ED and FGD are treated as the authoritative baseline, per this project's own convention — secondary research verifies and extends them, and is never silently merged over them when it disagrees; disagreements are always shown, not resolved by assumption.</p>
  </div></div>`;
  h += `<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>Architecture</h3></div><div class="card-b" style="font-size:12.5px;color:var(--muted);line-height:1.7">
    <p>This is now a real web application: a Node/Express backend with a SQLite database, serving this frontend over a REST API. An admin (password-protected) can trigger a live secondary-research pass for any State at any time — the backend calls Claude with real web-search tool access, parses the findings, and writes them to the database, visible immediately in the Research Log and on that State's profile.</p>
    <p>Scaling to the other 25 licenses means adding their ED/FGD documents, running the same structuring pass, and loading the result into this same database schema — the application code does not change.</p>
  </div></div>`;
  h += `<div class="card"><div class="card-h"><h3>Source documents</h3></div><div class="card-b tight"><table class="dt"><thead><tr><th>State / UT</th><th>Expert Discussion</th><th>FGD</th><th>Secondary research</th></tr></thead><tbody>`+
    STATES.map(s=>`<tr><td class="state-link" onclick="goState('${s.code}')">${esc(s.name)}</td><td>${esc(s.ed.date)} · ${esc(s.ed.location)}</td><td>${s.fgdPending?'<span class="tag t-mute">Not yet conducted</span>':esc(s.fgd.meta.split('·')[0])+'…'}</td><td>${s.secondary.pending?'<span class="tag t-mute">Not yet run</span>':'<span class="tag t-ok">Verified</span>'}</td></tr>`).join('')+
    '</tbody></table></div></div>';
  return h;
}

/* ========================= ROUTER / INIT ========================= */

function render(){
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('on', b.dataset.view===F.view));
  buildFilters();
  const c = document.getElementById('canvas');
  if(F.view==='overview') c.innerHTML = renderOverview();
  else if(F.view==='state') c.innerHTML = renderState();
  else if(F.view==='compare') c.innerHTML = renderCompare();
  else if(F.view==='phase') c.innerHTML = renderPhase();
  else if(F.view==='best') c.innerHTML = renderBest();
  else if(F.view==='reconcile') c.innerHTML = renderReconcile();
  else if(F.view==='research') c.innerHTML = renderResearchLogView();
  else if(F.view==='method') c.innerHTML = renderMethod();
  window.scrollTo(0,0);
  animateBars();
}

async function loadStates(){
  const list = await API.get('/states?license=FL');
  STATES = list.sort((a,b)=>a.name.localeCompare(b.name));
  STATES.forEach(s=>ST_BY_CODE[s.code]=s);
  if(!F.state) F.state = STATES[0]?.code;
  if(!F.cmp.length) F.cmp = [STATES[0]?.code, STATES[1]?.code].filter(Boolean);
}
async function checkAuth(){
  try { AUTH = await API.get('/auth/me'); } catch(e){ AUTH = {isAdmin:false, username:null}; }
  buildRailAdmin();
}

async function init(){
  buildNav();
  document.getElementById('downloadBtn').onclick = ()=>window.print();
  document.getElementById('loginCancel').onclick = closeLogin;
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const r = await API.post('/auth/login', { username: fd.get('username'), password: fd.get('password') });
      AUTH = { isAdmin:true, username:r.username };
      buildRailAdmin(); closeLogin(); toast('Signed in as '+r.username, 'success'); render();
    } catch(err){
      const el = document.getElementById('loginError'); el.hidden=false; el.textContent = 'Invalid username or password.';
    }
  };
  document.getElementById('globalSearch').addEventListener('input', e=>{
    const q = e.target.value.trim().toLowerCase();
    if(F.view!=='overview'){ F.search=q; return; }
    F.search = q; render();
  });
  document.getElementById('globalSearch').addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      const match = STATES.find(s=>s.name.toLowerCase().includes(e.target.value.trim().toLowerCase()));
      if(match) goState(match.code);
    }
  });

  await Promise.all([loadStates(), checkAuth()]);
  render();
}
window.goView = goView; window.goState = goState; window.toggleCmp = toggleCmp; window.sortBy = sortBy;
window.triggerResearch = triggerResearch; window.openLogin = openLogin; window.logout = logout;
init();
