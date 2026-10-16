const Anthropic = require('@anthropic-ai/sdk');
const { waitUntil } = require('@vercel/functions');
const pool = require('../db/db');

const MODEL = process.env.RESEARCH_MODEL || 'claude-opus-5-5';
const MAX_SEARCHES = Number(process.env.RESEARCH_MAX_SEARCHES || 8);
const MAX_PAUSE_RESUMES = 4;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Secondary research needs its own Anthropic API key ' +
      '(from console.anthropic.com) set as a server environment variable — this is separate ' +
      'from any credential a coding session used to build this app.'
    );
  }
  return new Anthropic();
}

function buildPrompt(state, steps, existingSecondary) {
  const stepLines = steps.map(s => `${s.n}. [${s.phase}] ${s.title}${s.note ? ' — ' + s.note : ''}`).join('\n');
  const priorResearch = existingSecondary && !existingSecondary.pending
    ? `\n\nA previous secondary-research pass already found:\nConfirms: ${existingSecondary.confirms_json}\nContradicts: ${existingSecondary.contradicts_json}\nNew detail: ${existingSecondary.new_detail_json}\n\nDo not just repeat these — check whether anything has changed since (a newer notification, amendment, portal update), and add anything genuinely new.`
    : '';

  return `You are doing secondary (desk/web) research for the "Cost of Regulation" project — Quality Council of India (QCI), for DPIIT, Government of India. We are verifying and extending a primary-source Expert Discussion (ED, an interview with a government official) about the "${state.name}" process for the "Factory License" service, using official government sources: the state's own Factories Act Rules, gazette notifications, citizen charter / SOP documents, and the official application portal.

Here is what the Expert Discussion already recorded for ${state.name}, which you should try to CONFIRM, CONTRADICT, or EXTEND with your research — cite specifics, do not just repeat it back:

Issuing authority: ${state.issuing_authority}
Portal: ${state.portal_name}${state.portal_url ? ' (' + state.portal_url + ')' : ' (URL not previously confirmed)'}
Timeline: ${state.timeline_text || 'not specified'} (basis: ${state.timeline_basis || 'unclear'})
Deemed approval: ${state.deemed_status} — ${state.deemed_text || ''}
Fees: ${state.fees_text || 'not specified'}
Validity: ${state.validity_text || 'not specified'}

Recorded process steps:
${stepLines}
${priorResearch}

Use web search to find and cite (with URLs, and a notification/amendment date where shown):
- The state's Factories Act Rules or equivalent, especially any clause on statutory processing timeline or deemed approval.
- The official portal's citizen charter / user manual / SOP, if published — these sometimes list a MORE GRANULAR numbered step sequence than an interview summary gives. Capture it if found.
- The official fee schedule/notification.
- Any recent (last 1-2 years) amendment or reform notification.

Be honest when something cannot be verified online — do not fabricate a citation or a figure.

When you are done researching, give your final answer as a single fenced JSON code block (\`\`\`json ... \`\`\`) with EXACTLY this shape, and nothing else after it:
{
  "confirms": ["short finding, phrased in full sentences, citing what confirmed it"],
  "contradicts": ["short finding describing what the official record said vs what you found, with your source"],
  "newDetail": ["short finding adding genuinely new information not in the ED record, e.g. a portal URL, a more granular step list, a recent reform"],
  "sources": ["Source name, with URL and date if shown"],
  "notes": "A 2-4 sentence synthesis of the single most important thing you found, written for someone reading this on a dashboard card."
}
Keep each array to the 2-5 highest-value items — do not pad it. If you genuinely found nothing on a category, give an empty array, not a filler sentence.`;
}

function extractJson(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON block found in the research response.');
  const jsonStr = m[1] || m[0];
  return JSON.parse(jsonStr);
}

async function doResearch(runId, state, steps, existingSecondary, stateCode, licenseCode) {
  try {
    const client = getClient();
    const prompt = buildPrompt(state, steps, existingSecondary);
    const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: MAX_SEARCHES }];
    let messages = [{ role: 'user', content: prompt }];
    let finalMessage = null;

    for (let i = 0; i < MAX_PAUSE_RESUMES; i++) {
      const response = await client.messages.create({ model: MODEL, max_tokens: 8000, tools, messages });
      if (response.stop_reason === 'pause_turn') {
        messages = [...messages, { role: 'assistant', content: response.content }];
        continue;
      }
      finalMessage = response;
      break;
    }
    if (!finalMessage) throw new Error('Research run did not complete within the pause/resume limit.');

    const textBlocks = finalMessage.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    const parsed = extractJson(textBlocks);

    await pool.query(
      `UPDATE research_runs SET status='done', summary=$1, parsed_json=$2, sources_json=$3, raw_text=$4, completed_at=NOW() WHERE id=$5`,
      [parsed.notes || '', JSON.stringify(parsed), JSON.stringify(parsed.sources || []), textBlocks, runId]
    );

    await pool.query(`
      INSERT INTO secondary_research (state_code, license_code, confirms_json, contradicts_json, new_detail_json, sources_json, notes, pending, last_run_id, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,NOW())
      ON CONFLICT (state_code, license_code) DO UPDATE SET
        confirms_json=EXCLUDED.confirms_json, contradicts_json=EXCLUDED.contradicts_json,
        new_detail_json=EXCLUDED.new_detail_json, sources_json=EXCLUDED.sources_json,
        notes=EXCLUDED.notes, pending=0, last_run_id=EXCLUDED.last_run_id, updated_at=NOW()
    `, [stateCode, licenseCode, JSON.stringify(parsed.confirms || []), JSON.stringify(parsed.contradicts || []),
        JSON.stringify(parsed.newDetail || []), JSON.stringify(parsed.sources || []), parsed.notes || '', runId]);

    await pool.query('UPDATE states SET secondary_pending = 0 WHERE code = $1 AND license_code = $2', [stateCode, licenseCode]);
  } catch (err) {
    await pool.query(`UPDATE research_runs SET status='failed', error=$1, completed_at=NOW() WHERE id=$2`, [String(err.message || err), runId]);
  }
}

async function runResearch({ stateCode, licenseCode, triggeredBy }) {
  const { rows: [state] } = await pool.query('SELECT * FROM states WHERE code = $1 AND license_code = $2', [stateCode, licenseCode]);
  if (!state) throw new Error(`Unknown state ${stateCode} for license ${licenseCode}`);
  const { rows: steps } = await pool.query('SELECT * FROM steps WHERE state_code = $1 AND license_code = $2 ORDER BY n', [stateCode, licenseCode]);
  const { rows: [existingSecondary] } = await pool.query('SELECT * FROM secondary_research WHERE state_code = $1 AND license_code = $2', [stateCode, licenseCode]);

  const { rows: [{ id: runId }] } = await pool.query(
    `INSERT INTO research_runs (state_code, license_code, triggered_by, status) VALUES ($1,$2,$3,'running') RETURNING id`,
    [stateCode, licenseCode, triggeredBy]
  );

  // On Vercel, a serverless function's background work is killed once the
  // response is sent unless kept alive with waitUntil; outside Vercel it's a
  // harmless wrapper and the promise just runs normally in the long-lived
  // local Node process.
  waitUntil(doResearch(runId, state, steps, existingSecondary, stateCode, licenseCode));

  return runId;
}

module.exports = { runResearch };
