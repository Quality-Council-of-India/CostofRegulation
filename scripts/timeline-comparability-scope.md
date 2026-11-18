# Scope: making timelines comparable across States

**Status: proposal, not yet built.** This document scopes the work and asks for three
decisions (marked **DECISION** below) before any of it starts.

---

## 1. The problem

The Secretary's observation about steps — that one State's single step can be two or three
elsewhere — has a direct equivalent in timelines, and it is larger. Three cases found during
the published-rules validation, each from an official source:

| State | Headline figure | What it actually measures |
|---|---|---|
| Nagaland | **1–2 days** | Only the final leg. The department's own published procedure shows a prior plan-approval / permission-to-construct stage (Form 1, 16 documents, Pollution Board and Fire NOCs) that the field record does not mention. Its own text says "where the papers are correct" and "no statutory timeline has been notified". |
| Manipur | **90 days** | Working days, by statutory definition (Manipur PSDG Act 2021, s.2(c)) — roughly 18 calendar weeks. Also two sequential 90-day clocks, licence and plan approval being separately notified services. |
| West Bengal | **65 days** | ⚠️ **Correction (18 Nov):** this was originally listed here as proven. It is not. The WB RTPS Rules 2013 rules 4(1) and 5 (holidays excluded, clock restarts on deficiency) are real and verified — but nothing establishes that WB's Factory Licence figure is governed by them. The published-rules check for WB's timeline is `not_found` with no citation, because every WB government host was unreachable, and the ED record says the governing Act/Rule is "not specified". Classified `not-comparable`. |

Put on one chart, "Nagaland 1–2 days" against "West Bengal 65 days" compares a part-journey in
calendar days with a whole journey in holiday-excluded, resettable days. The true gap is not
the ~40× the numbers suggest, and may not even run in the same direction.

**This affects any cross-State timeline chart or ranking the dashboard shows today**, including
the Compare States KPI row, the National overview timeline bars, and the Stage comparison view.

## 2. Why this is fixable from data we already hold

Same situation as step equivalence: the raw material is already in the record and does not
need new fieldwork.

- 162 ED licence records; **148 carry a numeric timeline**, and **all 162 carry a `basis`
  statement** describing where the figure came from.
- The `basis` and `text` fields routinely state the limiting condition in plain words —
  Andhra Pradesh's says "7 working days"; Dadra & Nagar Haveli's says "administrative practice,
  not a statutory turnaround"; Arunachal's says "Expert's own estimate"; Puducherry's decomposes
  into "20 days including inspection, plus two 5-day review stages".

So this is a **classification pass over existing text**, with the published-rules lane available
to adjudicate the hard cases — not a new research exercise.

## 3. Proposed classification

Five dimensions, each assigned per licence record, each requiring quoted evidence from the
record's own text (or a cited published rule) — never inference from the number alone.

**A · Journey scope** — what the clock covers
`licence-only` · `licence-plus-antecedent` (includes a prior plan/permission approval) ·
`final-leg-only` (only the last internal step) · `applicant-inclusive` (includes the
applicant's own preparation time — seen in Kerala's FGD figure) · `unclear`

**B · Day unit**
`calendar` · `working` · `working-holidays-excluded` · `unclear`

**C · Clock behaviour on a query or deficiency**
`continuous` · `pauses` · `resets` · `unclear`

**D · Authority of the figure**
`notified` (gazette / RTS / PSGA instrument) · `departmental-practice` ·
`official-estimate` (the interviewee's own guess) · `business-reported`

**E · Promised or experienced**
`promised` (what the rule or official says) · `experienced` (what businesses lived)

Dimension E matters on its own: the dashboard currently places ED-sourced promises and
FGD-sourced experiences on the same axis in places, which is its own apples-to-oranges.

### The derived output

A `comparableDays` figure — normalised to **calendar days for the full journey** — plus an
explicit `determinable: true|false`. Where the source does not support normalisation, it stays
`false` with a stated reason. **Expect a material share to be non-determinable**, and that is a
legitimate result: "only N of 22 States can be safely compared on time" is itself a finding the
programme needs, and is far better than a confident ranking that does not survive scrutiny.

## 4. Method

Mirrors the step-equivalence pass, which worked:

1. Read every target record's `timeline` object in full (`minDays`, `maxDays`, `basis`, `text`)
   plus any timeline-related findings and gap flags.
2. Assign the five dimensions, quoting the exact supporting phrase for each.
3. Where the record is silent on a dimension, consult that State's published-rules validation
   (`scripts/secondary_data/<CODE>.json`) if one exists — several already settle the day-unit
   and clock-reset questions outright.
4. Derive `comparableDays` only where A–C are known; otherwise mark non-determinable with a
   reason.
5. **Verification pass** (required, as with step equivalence): re-check every quoted phrase
   actually appears in the source; confirm no dimension was inferred from the bare number; and
   confirm every low-confidence assignment is flagged rather than silently treated as certain.

Anti-fabrication rules carry over unchanged: never invent a unit or a clock rule that the source
does not state.

## 5. Scope options

**DECISION 1 — how wide.**

| Option | Records | Notes |
|---|---|---|
| **A. Factory License only** (recommended) | 22 | Matches the step-equivalence and published-rules pilots, so all three analytical layers cover the same licence and can be shown together. Proves the method before scaling. |
| B. All licences, ED records only | 148 | ~7× the work. No published-rules lane to adjudicate hard cases outside Factory License. |
| C. Everything, ED + FGD | ~250 | Full coverage, largest effort, and FGD figures are mostly `experienced` so they need dimension E handled carefully throughout. |

## 6. What the dashboard would show

**DECISION 2 — how prominent.**

- **Minimum:** a caveat marker on every timeline figure that is not safely comparable, with the
  reason on hover — the same pattern as the "http only" citation tag.
- **Recommended:** the above, plus a *Can we compare these timelines?* page as a sibling to the
  step-equivalence page — listed figure vs comparable figure per State, and a grid of the five
  dimensions showing exactly why a given State drops out of the comparison.
- **Most assertive:** the above, plus **suppressing or visibly down-ranking non-comparable
  figures in the Compare States and National overview charts**, so a reader cannot accidentally
  read a false ranking. This is the safest option for a Secretary-facing artefact and the most
  intrusive on the existing views.

## 7. Known limits, stated upfront

- Where a source never states the day unit or the clock rule, this pass **cannot invent one**.
  Some States will remain non-comparable, and the honest output is a smaller comparable set.
- Normalising working days to calendar days needs an assumption (a ~1.4× factor for a 5-day
  week with public holidays). **DECISION 3:** either apply a single stated factor consistently
  and label it an assumption, or refuse to normalise and present working-day and calendar-day
  States as two separate groups that are never mixed. The second is more defensible; the first
  is more useful in a chart. My recommendation is the second, with the first offered as a
  clearly-labelled toggle if a single comparable number is genuinely needed.
- This does not measure actual elapsed time. It makes *stated* timelines comparable. The gap
  between stated and actual stays the business of the ED-vs-FGD contradiction work.

## 8. Effort

Factory License pilot (Option A) is comparable to the step-equivalence pass: one analysis agent
over 22 records with a verification pass, then build work for the dashboard layer. The
published-rules data for 15 of those 22 States is already in place to adjudicate hard cases,
which should make it faster than step equivalence was.
