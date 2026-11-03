# Factory License step-equivalence analysis (pilot, 22 states)

## Why this exists

The Secretary's observation: "number of steps" is not a fair comparison across states as-is.
One state's single process step can functionally correspond to two or more steps in another
state (e.g. one state might combine "upload documents + pay fee" into a single online action,
while another splits them into two distinct steps). Comparing raw step counts across states
without accounting for this makes some states look more/less burdensome than they really are.

This is a **fact-based mapping exercise, not an assumption exercise**. Every equivalence claim
must be backed by the actual step text (title + note) from the real ED/FGD record — never by
what you'd expect a factory licensing process to look like in general.

## Source data

Read these 22 states' Factory License (`FAL`) records:
- ED-authoritative (steps are the official's own description): AR, HP, JH, MN, NL, TG, WB
- ED+FGD Mode A (ED steps authoritative, FGD adds findings/quotes only — use the ED steps):
  AP, CG, DNHDD, JK, PY, RJ, UP
- FGD-only Mode B (steps are a best-effort reconstruction from business testimony, NOT an
  official source — treat with lower confidence, flag explicitly): AS, DL, GJ, HR, KL, MH,
  MP, PB

Read from `/home/user/CostofRegulation/scripts/ed_data/<CODE>.json` (licenses[].serviceCode
=== "FAL") for the first two groups, and `/home/user/CostofRegulation/scripts/fgd_data/<CODE>.json`
(same filter) for the Mode B group.

## Method — build the canonical sub-stage taxonomy BOTTOM-UP

1. Read every one of the 22 states' FAL `steps[]` arrays in full (title, phase, note, automated,
   documents where present) before writing anything.
2. From what you actually read — not from a generic idea of "how factory licensing normally
   works" — identify the distinct functional actions that recur across states. Typical
   candidates you may or may not actually find evidence for: online application submission,
   document upload, fee payment, document/application scrutiny by the department, deficiency
   notice & resubmission, field/site verification or inspection, a separate antecedent approval
   (e.g. Building Plan Approval) bundled into the same flow, final approval/sanction, licence
   issuance/certificate generation. Only include a sub-stage in your taxonomy if at least one
   state's actual step text supports it — do not add a sub-stage you expect to exist but find
   no evidence for.
3. For each state, map every one of its real steps to one or more of these canonical sub-stages.
   - If one state's single step text clearly covers two sub-stages at once (e.g. "upload
     documents and pay the prescribed fee online" in one step), record it as covering BOTH
     sub-stages, and quote the exact phrase that supports each.
   - If a step's text is too brief or vague to confidently say it covers one sub-stage vs two,
     do NOT guess — map it to the single most clearly supported sub-stage and add a `confidence:
     "low"` with a one-line reason, rather than inventing a second sub-stage it might imply.
   - A step that genuinely does not map to any recurring sub-stage (state-specific, e.g. a
     particular antecedent clearance unique to that state) is fine — map it to a
     state-specific label rather than forcing it into the shared taxonomy.
4. For Mode B (FGD-only) states, additionally set `stepSourceConfidence: "business-testimony,
   not officially verified"` on every mapping for that state, since the underlying step list
   itself is a reconstruction, not an official account.

## Verification pass (required — this is the "checked" part)

After building the full mapping, re-read it against the source text one more time, specifically
checking: (a) every evidence quote you cited actually appears in (or is a faithful paraphrase
of) that state's real step text — not invented; (b) you did not force two states' steps into
"equivalent" status just because they're in the same phase tag (e.g. two "scrutiny" steps are
NOT automatically equivalent — only mark them equivalent if their actual described activity
matches); (c) every low-confidence mapping is actually flagged as such, not silently treated as
certain.

## Output

Write ONE JSON file to the exact path given, with this shape:

```json
{
  "license": "FAL",
  "canonicalSubStages": [
    { "code": "APPLY_ONLINE", "label": "Online application submission", "evidenceStates": ["RJ","HP","..."] },
    ...
  ],
  "stateMappings": {
    "RJ": {
      "hasED": true,
      "rawStepCount": 5,
      "mappings": [
        {
          "stepN": 1,
          "stepTitle": "Submit Factory Licence application online",
          "subStages": ["APPLY_ONLINE"],
          "evidence": "Submit Factory Licence application online",
          "confidence": "high"
        },
        {
          "stepN": 4,
          "stepTitle": "Applicant informed online of incomplete/incorrect documents and resubmits",
          "subStages": ["DEFICIENCY_NOTICE", "RESUBMISSION"],
          "evidence": "Applicant informed online of incomplete/incorrect documents and resubmits",
          "confidence": "high"
        }
      ],
      "canonicalSubStageCount": 6,
      "stepSourceConfidence": null
    },
    "GJ": {
      "hasED": false,
      "rawStepCount": 4,
      "mappings": [ ... ],
      "canonicalSubStageCount": 5,
      "stepSourceConfidence": "business-testimony, not officially verified"
    }
  },
  "notes": [
    "One or two sentences on anything methodologically notable — e.g. a state whose step text was too thin to map confidently, or a sub-stage only one state's process actually has."
  ]
}
```

`canonicalSubStageCount` is the fair, comparable number — how many of the shared canonical
sub-stages this state's process actually covers, regardless of how many raw steps the official
record grouped them into. This is what should let "Rajasthan: 5 steps" and "Himachal Pradesh:
7 steps" be compared honestly even if they're structured differently.

Produce ONLY the raw JSON object, no markdown fences, written to the exact output path given.
Never invent a mapping you can't point to real step text for.
