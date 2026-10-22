# FGD-report extraction spec (Phase 2 — business-side experience, cross-checked against ED)

You are extracting real Focused Group Discussion (FGD — business owners describing their
actual experience) content for the Quality Council of India's Cost of Regulation project.
This feeds a public DPIIT-facing dashboard — factual fidelity matters enormously. The FGD
transcript is "gospel truth" for what participants said — never invent facts, numbers, or
quotes, and never fill a gap with a plausible-sounding guess.

## Reading documents

- `.docx`: convert with `pandoc <file> -t plain -o <file>.txt` (Bash), then Read the `.txt` file.
- `.pdf`: use the Read tool directly — it reads PDFs natively. Pass `pages` for anything over ~15 pages.

## Multiple sessions per service

A service with files like `XX_FGD_FAL.docx`, `XX_FGD_FAL_1.docx`, `XX_FGD_FAL_2.docx` means
**multiple separate FGD sessions were held for that service** (different participant groups) —
these are NOT duplicates of one discussion (unlike some ED filename quirks from the earlier
pass). Read every file for a service and synthesize combined findings/quotes across all
sessions for that one license entry, noting how many sessions in `sessionCount`.

One exception: if two files for the same service really do look like the same session
recorded twice (identical date/participants/content), say so in a `remarks` entry and treat
them as one, the way a similar case was resolved in the ED pass — but default to assuming
multiple files are multiple real sessions unless the content clearly says otherwise.

## Cross-checking against the existing ED record

For every service, first check whether `/home/user/CostofRegulation/scripts/ed_data/<CODE>.json`
(read it) already has a `licenses[]` entry for that `serviceCode`. This tells you which of two
modes to use:

**Mode A — ED exists for this (state, service).** Add FGD findings, a quotes bank, and gaps
alongside the existing ED record — do NOT re-derive `steps`/`timeline`/`fees`/`validity`/
`deemedApproval`/`documents`/`portal`/`issuingAuthority`; those stay the ED's. Your job here is
specifically to compare: does what businesses describe match what the official said? Flag a
real `INCONSISTENT` gap wherever the FGD genuinely contradicts the ED on a concrete fact
(timeline, fee, deemed approval, a step's automation, a document requirement) — quote or
closely paraphrase BOTH sides and name which source said what. Do not flag a difference in
tone or emphasis as inconsistent — only genuine factual contradiction.

**Mode B — No ED exists for this (state, service)** (the FGD covers a service/state pair the
ED pass never reached — this happens, e.g. a state's FGD covers a service its ED didn't).
Produce the full structured record (same shape as the ED spec: `steps`, `timeline`, `fees`,
`validity`, `deemedApproval`, `documents`, `documentsNote`, `portal`, `issuingAuthority`) as
best you can from what participants describe — but this is business testimony, not an
official interview, so it will likely be less precise/complete. Say so explicitly: set
`hasED: false` and add a `documentsNote` or `remarks` entry noting this record is FGD-only
and has not been verified against an official source. Still apply the same MISSING/VAGUE gap
discipline — don't guess at a number no participant gave.

## Tagging taxonomy (same as the ED pass)

- `category`: pain | policy | procedural | redundant | delay | suggestions | remarks
- `tags` (reuse, don't invent new ones): PORTAL, CONSULT, FEES, TIMELINE, INTERDEP, CLARITY,
  COMPLY, NORMS, RENEWAL, INSPECT, QUERY, GRIEVANCE, DUPDOC, CAPACITY, INFORMAL, POSITIVE, OTHER
- `sentiment`: issue | neutral | positive | suggestion
- gap `flag`: MISSING | VAGUE | GOOD_PRACTICE | REFORM | INCONSISTENT

## Quotes

Pull real, verbatim (or lightly trimmed) quotes from participants for the quotes bank — this
is the single biggest value FGD data adds over ED alone. Attribute by role as the transcript
gives it (e.g. "Participant", "Business Owner") with a short topic label, tags, and sentiment.
Aim for several quotes per service where the transcript supports it — don't under-use this.

## A naming oddity

Madhya Pradesh has a file `MP_FGD_TLP.docx` — "TLP" isn't in the known service-code legend.
Read it and determine what it actually covers (most likely Trade License Approval/TLA or
Renewal/TLR, but check the content rather than assuming) — map it to the closest real
canonical code and note the discrepancy in a `remarks` entry. Don't silently invent a new code.

## Output — one JSON object per STATE

Write to the exact path you're given:

```json
{
  "code": "XX",
  "name": "State/UT full name",
  "licenses": [
    {
      "serviceCode": "FAL",
      "serviceName": "Factory License",
      "sourceFiles": ["XX_FGD_FAL.docx", "XX_FGD_FAL_1.docx"],
      "sessionCount": 2,
      "hasED": true,
      "findings": [
        { "source": "fgd", "category": "pain", "tags": ["PORTAL"], "sentiment": "issue", "text": "..." }
      ],
      "quotes": [
        { "speaker": "Participant", "quote": "...", "topic": "Short label", "tags": ["PORTAL"], "sentiment": "issue" }
      ],
      "gaps": [
        { "flag": "INCONSISTENT", "text": "ED says X; FGD participants report Y — both quoted/paraphrased." }
      ],

      /* ONLY include the fields below when hasED is false (Mode B) — omit entirely when hasED is true: */
      "issuingAuthority": "...", "portal": {"name":"...","url":null},
      "timeline": {"minDays":null,"maxDays":null,"basis":"","text":"..."},
      "automationLevel": "full|partial|manual|unclear", "applicantOfficeVisit": "yes|no|unclear",
      "documents": ["..."], "documentsNote": "FGD-only record, not yet verified against an official ED.",
      "deemedApproval": {"status":"yes|no|unclear","days":null,"text":"..."},
      "validity": {"text":"..."}, "fees": {"text":"..."},
      "steps": [{"n":1,"phase":"pre|apply|fee|scrutiny|inspect|approve|renew","title":"...","automated":true|false|"partial"|null,"note":"..."}],
      "remarks": ["..."]
    }
  ]
}
```

Aim for roughly 10-20 `findings` and 3-10 `quotes` per license where the transcripts support
it; fewer is fine for thin sessions — never pad. Produce ONLY the raw JSON object, no markdown
fences, written to the exact output path given.
