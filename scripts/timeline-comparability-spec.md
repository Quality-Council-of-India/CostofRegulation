# Timeline comparability classification — Factory License calibration

## Why this exists

The dashboard compares State timelines on the same axis — but those numbers do not measure the
same thing. Three cases already proven from official sources:

- **Nagaland "1–2 days"** measures only the final leg; the department's own published procedure
  shows a prior plan-approval stage the field record never mentions.
- **Manipur "90 days"** are *working* days by statutory definition (~18 calendar weeks).
- **West Bengal "65 days"** exclude public holidays and the clock *restarts* when a missing
  document is produced.

Your job is to classify every Factory License timeline so the dashboard can stop comparing
incomparable figures. This is a **calibration run**: the share you can and cannot classify
decides whether this is extended to the other 24 licences.

## The rule that matters most

Every dimension you assign must be supported by a phrase you can **quote from the record's own
text**, or from a cited published rule. Never infer a dimension from the bare number. If a
record does not say whether its days are calendar or working, the answer is `unclear` — not
your best guess. A high `unclear` count is an honest and useful result; a confident
misclassification is not.

## Your inputs

For each of the 22 States with Factory License data:

1. **The primary record** — `/home/user/CostofRegulation/scripts/ed_data/<CODE>.json` and/or
   `/home/user/CostofRegulation/scripts/fgd_data/<CODE>.json`, `licenses[]` where
   `serviceCode === "FAL"`. Read the whole `timeline` object (`minDays`, `maxDays`, `basis`,
   `text`), and also scan that licence's `findings` and `gaps` for anything about timing,
   queries, clock resets or inspection sequencing.
2. **The published-rules validation**, where one exists —
   `/home/user/CostofRegulation/scripts/secondary_data/<CODE>.json`. Available for 15 of the 22:
   AR, DL, DNHDD, HP, HR, JH, KL, MH, MN, MP, NL, PY, TG, UP, WB. Its `timeline` and
   `deemedApproval` checks frequently settle the day-unit and clock questions outright — prefer
   it over the field record where they conflict, and say so.

States with FAL data: AP, AR, AS, CG, DL, DNHDD, GJ, HP, HR, JH, JK, KL, MH, MN, MP, NL, PB,
PY, RJ, TG, UP, WB.

## The five dimensions

**A · `journeyScope`** — what the clock covers
- `licence-only` — the licence grant step alone
- `licence-plus-antecedent` — includes a prior plan/permission/building approval
- `final-leg-only` — only the last internal step (e.g. post-inspection decision)
- `applicant-inclusive` — includes the applicant's own preparation time
- `unclear`

**B · `dayUnit`** — `calendar` · `working` · `working-holidays-excluded` · `unclear`

**C · `clockBehaviour`** on a query or deficiency — `continuous` · `pauses` · `resets` · `unclear`

**D · `authority`** — where the figure comes from
- `notified` (a gazette / RTS / PSGA instrument) · `departmental-practice` ·
  `official-estimate` (the interviewee's own guess) · `business-reported` · `unclear`

**E · `promisedOrExperienced`** — `promised` · `experienced` · `unclear`
(ED figures are usually `promised`, FGD figures usually `experienced` — but verify from the
text, do not assume from the source lane.)

## Comparison grouping — do NOT normalise

A decision has been taken: **do not convert working days into calendar days.** Do not apply a
conversion factor anywhere.

Instead assign each record a `comparisonGroup`, and only records in the same group may ever be
charted against each other:

- `full-journey-calendar`
- `full-journey-working`
- `partial-journey` (any `journeyScope` of `final-leg-only` or `licence-only` where an
  antecedent approval demonstrably exists for that State)
- `not-comparable` — anything where `journeyScope` or `dayUnit` is `unclear`, or the figure is
  an `official-estimate` with no stated basis

Set `determinable: true` only when A, B and D are all known well enough to place the record in
a group other than `not-comparable`. Where `false`, give a one-line `reason`.

## Verification pass (required)

After classifying all 22, go back through and check: (a) every quoted phrase genuinely appears
in the source you attribute it to; (b) no dimension was inferred from the number alone;
(c) every uncertain assignment is marked `confidence: "low"` with a reason rather than being
silently treated as certain; (d) where the published-rules lane and the field record conflict,
you followed the published rule and recorded the conflict.

## Output

Write ONE JSON file to the exact path given:

```json
{
  "license": "FAL",
  "classifiedAt": "2026-11-18",
  "states": {
    "WB": {
      "statedMin": 65, "statedMax": 65,
      "journeyScope": "licence-only",
      "dayUnit": "working-holidays-excluded",
      "clockBehaviour": "resets",
      "authority": "official-estimate",
      "promisedOrExperienced": "promised",
      "evidence": {
        "dayUnit": "WB RTPS Rules 2013 rule 5: 'Public holidays shall be excluded from the stipulated time limit' — via secondary_data/WB.json",
        "clockBehaviour": "rule 4(1) restarts the clock from the date a missing document is produced",
        "authority": "ED basis field: 'Approximate figure discussed by the expert'"
      },
      "confidence": "high",
      "comparisonGroup": "full-journey-working",
      "determinable": true,
      "note": "one sentence a reader needs, or null"
    }
  },
  "groups": {
    "full-journey-calendar": [".."], "full-journey-working": [".."],
    "partial-journey": [".."], "not-comparable": [".."]
  },
  "calibration": {
    "totalStates": 22,
    "determinable": 0,
    "notDeterminable": 0,
    "byDimensionUnclear": {"journeyScope": 0, "dayUnit": 0, "clockBehaviour": 0, "authority": 0},
    "secondaryHelped": 0,
    "verdict": "two or three sentences: is this worth extending to the other 24 licences, given that only Factory License has a published-rules lane to fall back on?"
  },
  "remarks": ["anything methodologically notable"]
}
```

Produce ONLY the raw JSON object, no markdown fences. The `calibration` block is the point of
this run — be accurate and unflattering in it.
