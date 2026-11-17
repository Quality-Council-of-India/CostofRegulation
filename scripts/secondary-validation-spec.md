# Secondary-research fact validation — Factory License (third source lane)

## Why this exists

The dashboard already carries two primary sources per State × licence: the Expert Discussion
(ED — the issuing official describing the process) and the Focused Group Discussion (FGD —
business owners describing what actually happened). QCI's field-survey phase is now closed, so
gaps and contradictions in that record can no longer be resolved by going back to the field.

This pass adds a **third source lane**: independent verification of specific factual claims
against real government sources on the web. It does not replace or outrank the primary data —
it sits alongside it, and its job is to answer one question per fact: *does an official published
source confirm, contradict, or say nothing about what the ED/FGD record claims?*

## The anti-fabrication rule (absolute)

Every citation must be a URL you actually fetched and read **this session**. Never construct a
plausible-looking gazette number, rule citation, or URL. Never treat a WebSearch snippet as
having verified a page's content. If you cannot confirm a claim against a real fetched source,
the verdict is `not_found` — which is a perfectly good, honest answer and far more useful than a
guess. A wrong citation shown to a Secretary is much worse than an empty field.

## Your inputs

1. **The verified source list for your state**:
   `/home/user/CostofRegulation/scripts/source_lists/<CODE>.json` — these URLs were already
   individually fetched and content-checked in an earlier pass. Start here; they are your
   highest-value targets. (Re-fetch them yourself to read their actual content — the earlier
   pass only confirmed they were real and relevant, it did not extract facts from them.)
2. **The primary record to check against**:
   - `/home/user/CostofRegulation/scripts/ed_data/<CODE>.json` → `licenses[]` where
     `serviceCode === "FAL"` (if present)
   - `/home/user/CostofRegulation/scripts/fgd_data/<CODE>.json` → same filter (if present)

You may also search for and fetch **additional** government sources beyond the list if the listed
ones don't cover a fact — same verification rules apply (fetch it, read it, cite the exact URL).

## Fetching

Use `curl` via Bash. Note two things learned in earlier passes:
- Some government hosts reset `https://` but serve the same content over `http://`. If https
  fails, trying http is acceptable — but if you use an http-only source, set
  `"transport": "http"` on that citation so reviewers know the fetch wasn't transport-authenticated.
- Never disable TLS certificate verification, and never attempt to work around a 403/WAF bot
  check (no custom User-Agent spoofing). If a site refuses automated access, that's `not_found`.

Read HTML with `pandoc -f html -t plain`, PDFs with `pdftotext` (or render pages to images and
read them if the PDF is scanned).

## What to check

For each of these five facts, compare the ED/FGD claim against what you can verify:

| key | what to check |
|---|---|
| `timeline` | The statutory/notified number of days to get the licence |
| `fees` | The fee schedule or basis of calculation |
| `deemedApproval` | Whether deemed approval exists, and after how many days |
| `documents` | The required document checklist |
| `steps` | The process steps / whether it is online, whether inspection is required |

## Verdicts

- `confirmed` — an official source states the same fact as the ED/FGD record.
- `contradicted` — an official source states something **different**. Quote both sides exactly.
- `not_found` — you searched and fetched, but no official source addresses this specific point.
- `fills_gap` — the ED/FGD record was MISSING or VAGUE on this, and you found an official source
  that does state it. (This is the highest-value outcome, since the field phase is closed.)

## Output

Write ONE JSON file to the exact path given:

```json
{
  "state": "HP",
  "serviceCode": "FAL",
  "validatedAt": "2026-11-17",
  "checks": [
    {
      "key": "timeline",
      "primaryClaim": "45 days for the Factory Licence step, per the ED record",
      "verdict": "confirmed",
      "sourceSays": "exact quoted sentence or figure from the official source",
      "citation": {
        "title": "exact page/document title as it appears",
        "url": "the exact URL you fetched",
        "transport": "https"
      }
    },
    {
      "key": "fees",
      "primaryClaim": "not quantified in the ED record (flagged MISSING)",
      "verdict": "not_found",
      "sourceSays": null,
      "citation": null
    }
  ],
  "sourcesRead": ["every URL you actually fetched this session, including ones that yielded nothing"],
  "remarks": ["anything a reviewer should know — e.g. the only fee schedule found was from 2019 and may be superseded"]
}
```

Produce ONLY the raw JSON object, no markdown fences. Aim for all five `checks` keys to be
present even when the verdict is `not_found` — a complete, honest picture of what could and
could not be verified is the deliverable.
