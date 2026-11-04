# Factory License — verified government source list (pilot, one state)

## Why this exists

Before any fetching/scraping or fact validation happens, QCI wants a reviewable, exhaustive
list of the real government websites/portals/documents relevant to getting a Factory License
in your assigned state. This is a **list-compilation task only** — you are NOT validating
facts or writing citations against ED/FGD data yet. That comes in a later phase.

**The rule that matters most: every URL in your output must be one you personally visited
and confirmed this session — never a URL you only saw inside a WebSearch result snippet
without separately confirming it resolves and shows real content.** A search snippet
describing a page is not verification of that page. Treat "found via search" and "verified"
as two different things, and only the second belongs in your output.

## Your target

One state (you'll be given its code and name). License: Factory License (FAL).

## Step 1 — find candidates

Use WebSearch to find government sources relevant to getting a Factory License in this state:
- The state's official factory-licensing portal or single-window system (like Himachal
  Pradesh's OFRIS, or a state's EODB/Investor Facilitation Portal)
- The state's Factories Act Rules (the actual regulation text, as a gazette notification or
  official PDF)
- Any official checklist, document-requirement list, or process guide published by the
  Labour/Industries/Factories department
- The central National Single Window System (NSWS) page for this state/service, if relevant
- A central Ministry of Labour & Employment or OSH Code page, only if directly relevant to
  this state's process

Search in a mix of ways: "[State name] factory license portal", "[State name] factories rules
PDF", "[State name] factory license checklist site:gov.in", "[State name] single window
factory license", etc. Prioritize `.gov.in` and state-government domains. A consultancy
blog, news article, or non-government aggregator is NOT a valid source for this list —
skip it, even if it ranks well in search.

## Step 2 — verify every candidate, individually

For each candidate URL, actually fetch it yourself (use the Bash tool with `curl`, e.g.
`curl -sS -m 15 -L -w "\nHTTP_CODE:%{http_code} SIZE:%{size_download}\n" -o /tmp/check.html "<url>"`
then inspect the output — `pandoc -f html -t plain /tmp/check.html | head -40` for HTML, or
`file /tmp/check.<ext>` plus reading it with the Read tool for a PDF). Confirm:

1. It returns HTTP 200 (or a real redirect that lands on 200) — not a timeout, not a 403/404,
   not a connection failure.
2. The content is real and relevant — not an empty JS-rendering shell with no visible text
   (some government sites are modern single-page apps; `curl` alone won't show you their
   content — if a candidate URL only returns an empty shell, do not include it, note it in
   `remarks` as "found but not independently verifiable via this session's fetch method"
   instead of listing it as a real source).
3. It is in fact what it claims to be (a 200 response to a wrong/default page is not a pass —
   check the title and visible content genuinely match what you were looking for).

If a candidate fails verification (blocked, broken TLS cert, empty shell, wrong content, times
out), do NOT include it in `verifiedSources`. List it in `excluded` instead with a one-line
reason. This is expected and fine — some official sites genuinely won't be reachable this way,
and saying so honestly is the whole point of this exercise.

## Step 3 — one portal, multiple links

If a single portal has more than one page worth citing later (e.g. the portal's home/process
page AND a separate checklist PDF it links to AND a separate fees schedule page), include each
as its own entry under the same `portal` label — don't try to force multiple distinct pages
into one URL entry.

## Output

Write ONE JSON file to the exact path given:

```json
{
  "state": "HP",
  "serviceCode": "FAL",
  "compiledAt": "2026-11-04",
  "verifiedSources": [
    {
      "portal": "OFRIS — Himachal Pradesh Online Factory Registration Information System",
      "url": "https://ofris.hp.gov.in/",
      "whatItIs": "State factory-registration portal home/process page",
      "verifiedBy": "curl HTTP 200, confirmed real navigation/FAQ text content",
      "checkedAt": "2026-11-04"
    },
    {
      "portal": "OFRIS — Himachal Pradesh Online Factory Registration Information System",
      "url": "https://ofris.hp.gov.in/newchecklist.pdf",
      "whatItIs": "Official document checklist PDF for factory registration",
      "verifiedBy": "curl HTTP 200, confirmed valid 15-page PDF via `file`",
      "checkedAt": "2026-11-04"
    }
  ],
  "excluded": [
    {
      "url": "https://example-candidate.gov.in/factories-rules",
      "reason": "found via WebSearch but curl returns an empty JS-rendered shell with no readable text this session"
    }
  ],
  "remarks": ["anything methodologically notable"]
}
```

Produce ONLY the raw JSON object, no markdown fences, written to the exact output path given.
Never include a URL you did not personally fetch and inspect this session. When in doubt,
exclude rather than include.
