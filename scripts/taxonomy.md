# Tagging taxonomy for Cost of Regulation (Factory License) findings

Apply this taxonomy to turn narrative ED/FGD/secondary-research content into
structured, filterable findings — modeled on an internal QCI team's own
(stronger) prototype, which we are deliberately aligning with for consistency.

## category (one per finding)
- `pain` — a friction point / problem businesses or officials described
- `policy` — a rule, threshold, fee basis, or legal provision (factual, not itself a complaint)
- `procedural` — how the process actually flows in practice (sequencing, who does what)
- `redundant` — duplicate documents/steps, or data the government already holds
- `delay` — anything specifically about time lost / timeline behavior
- `suggestions` — a concrete improvement proposed by a participant or implied by the record
- `remarks` — context, caveats, asides that don't fit the above but are worth keeping

## tags (0+ per finding, topic codes — reuse ALL of these, don't invent new ones unless truly needed)
`INTERDEP` (cross-department coordination), `PORTAL` (portal/IT issue), `CONSULT` (reliance on consultants/agents),
`CLARITY` (unclear requirements/communication), `COMPLY` (compliance burden), `FEES` (money),
`NORMS` (technical/regulatory standards), `RENEWAL`, `INSPECT` (inspection), `QUERY` (query/clarification cycles),
`GRIEVANCE` (status visibility / tracking / redress), `TIMELINE`, `DUPDOC` (duplicate documents),
`CAPACITY` (skills/manpower shortage), `INFORMAL` (informal/unrecorded costs), `POSITIVE` (something working well),
`OTHER`

## sentiment (one per finding)
`issue` | `neutral` | `positive` | `suggestion`

## gap flags (0+ per state — apply across ED+FGD+secondary together, this is the most important layer)
- `MISSING` — a key fact (fee amount, exact timeline, validity period, deemed-approval status) is simply not stated anywhere in ED, FGD, or secondary research for this state. Say exactly what's missing.
- `VAGUE` — stated but not measurable ("fees as notified", "reasonable time") — quote the vague phrase.
- `INCONSISTENT` — ED and FGD (or ED and secondary research) genuinely disagree on the same fact. Quote both sides.
- `REFORM` — a concrete simplification the evidence points to (usually sourced from FGD suggestions or an official's own remark).
- `GOOD_PRACTICE` — something this state does better than the norm, worth other states copying.
- `SECONDARY_RESOLVED` — a gap that existed in ED/FGD alone, but secondary (web) research actually filled it or validated it with a citable source. This is our own addition (the internal prototype doesn't do secondary research at all) — use it whenever `secondary.confirms` / `secondary.newDetail` closes a real gap from ED/FGD.
- `SECONDARY_OPEN` — a gap secondary research was *not* able to resolve (still missing/vague after the web search pass). Say so plainly — don't guess.

## Non-negotiable fidelity rules
- Every finding must be traceable to something actually said/written in the ED transcript, the FGD transcript, or the existing `secondary` field of `server/db/seed-data.json` for that state. Do not invent facts, numbers, or quotes.
- Quotes (for the quotes bank) must be copied verbatim (or lightly trimmed for length with "…") from the FGD text file. Only states with an FGD document get quotes with real speaker attribution; for ED-only states, do not fabricate quotes — leave the quotes bank empty or pull a short direct attributed statement only if the ED transcript itself contains one in quotation marks.
- If you cannot find something, flag it `MISSING` — never fill a gap with a plausible-sounding guess.
