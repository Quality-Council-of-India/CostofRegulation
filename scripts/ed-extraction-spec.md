# ED-report extraction spec (Phase 1 — ED only, no FGD, no secondary research)

You are extracting real government-official interview (Expert Discussion / ED)
content for the Quality Council of India's Cost of Regulation project — a
DPIIT-facing dashboard comparing regulatory processes across India's states
and licenses. This feeds a public dashboard; **factual fidelity matters
enormously**. The ED transcript is "gospel truth" for what the official said —
never invent facts, numbers, steps, or quotes, and never fill a gap with a
plausible-sounding guess.

This is an ED-only pass: no FGD (business-side) data and no secondary (web)
research exist yet for this material, so every finding's `source` is `"ed"`,
and these gap flags do not apply yet: `INCONSISTENT` (only usable if the SAME
ED document genuinely contradicts itself — e.g. two different timeline
figures given in different sections), `SECONDARY_RESOLVED`, `SECONDARY_OPEN`.
Usable flags: `MISSING`, `VAGUE`, `GOOD_PRACTICE`, `REFORM`, and
self-contradiction `INCONSISTENT`.

## Reading a document

- `.docx`: convert with `pandoc <file> -t plain -o <file>.txt` (Bash), then
  Read the `.txt` file.
- `.pdf`: use the Read tool directly — it reads PDFs natively. Pass `pages`
  for anything over ~15 pages (max 20 pages per call).

## One JSON object per STATE, covering every license that state has an ED for

Write the result to the exact path you're given. Shape:

```json
{
  "code": "XX",
  "name": "State/UT full name",
  "licenses": [
    {
      "serviceCode": "FAL",
      "serviceName": "Factory License",
      "sourceFile": "XX_ED_FAL.docx",
      "issuingAuthority": "Department/designation that issues this, as stated",
      "portal": { "name": "Portal name as given, or best description", "url": null },
      "timeline": { "minDays": 7, "maxDays": 7, "basis": "short description of statutory/prescribed basis", "text": "1-3 sentence plain description" },
      "automationLevel": "full | partial | manual | unclear",
      "applicantOfficeVisit": "yes | no | unclear",
      "documents": ["each document actually named as required, as its own string"],
      "documentsNote": "",
      "deemedApproval": { "status": "yes | no | unclear", "days": null, "text": "1-2 sentences" },
      "validity": { "text": "1-2 sentences" },
      "fees": { "text": "1-2 sentences — exact figures if given, otherwise describe the basis" },
      "steps": [
        { "n": 1, "phase": "pre|apply|fee|scrutiny|inspect|approve|renew", "title": "short step title", "automated": true | false | "partial" | null, "note": "1 sentence, optional" }
      ],
      "ed": { "date": "as stated or best guess from the document, else null", "location": "", "expert": "name if given", "designation": "" },
      "remarks": ["any other notable official remark, recommendation, or caveat — one string each"],
      "dataGaps": [],
      "findings": [
        { "source": "ed", "category": "pain|policy|procedural|redundant|delay|suggestions|remarks", "tags": ["PORTAL","FEES","TIMELINE","INTERDEP","CLARITY","COMPLY","NORMS","RENEWAL","INSPECT","QUERY","GRIEVANCE","DUPDOC","CAPACITY","INFORMAL","POSITIVE","OTHER"], "sentiment": "issue|neutral|positive|suggestion", "text": "1-2 sentences, faithful to source" }
      ],
      "gaps": [
        { "flag": "MISSING|VAGUE|GOOD_PRACTICE|REFORM|INCONSISTENT", "text": "specific, useful detail" }
      ]
    }
  ]
}
```

Notes on fields:
- `phase` must be one of exactly: `pre`, `apply`, `fee`, `scrutiny`, `inspect`, `approve`, `renew` — pick the closest fit for every step; do not invent new phase codes.
- `steps` should reflect the ED's own described process granularity — don't pad or compress it artificially.
- Every `findings` entry needs category + at least one tag (reuse the tag list above; add `OTHER` if nothing fits — don't invent new tags) + sentiment.
- Aim for roughly 10-20 `findings` and 3-8 `gaps` per license — quality over quantity; skip anything you can't ground in the actual text.
- If a document is clearly NOT an Expert Discussion transcript (e.g. empty, corrupted, or something else entirely), still include its license entry but set `dataGaps: ["Could not extract — see note"]` and explain in a `remarks` entry rather than silently skipping it.
- `code` for the state must match exactly what you were told to use (the canonical code), not whatever abbreviation the filename happens to use.

Produce ONLY the raw JSON object (no markdown fences, no wrapper), written to the exact output path given.
