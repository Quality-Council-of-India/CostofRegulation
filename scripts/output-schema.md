# Output schema — one JSON object per state

Write your result to the exact path you're given (e.g. `.../tagged/AP.json`). Shape:

```json
{
  "code": "AP",
  "findings": [
    {
      "source": "ed" | "fgd" | "secondary",
      "category": "pain|policy|procedural|redundant|delay|suggestions|remarks",
      "tags": ["PORTAL", "CONSULT"],
      "sentiment": "issue|neutral|positive|suggestion",
      "text": "One clear sentence or two, in your own words but faithful to the source."
    }
  ],
  "quotes": [
    {
      "speaker": "Participant" or role given in the FGD doc,
      "quote": "Verbatim or lightly trimmed quote from the FGD transcript.",
      "topic": "Short label, e.g. 'Single Window Gap'",
      "tags": ["INTERDEP"],
      "sentiment": "issue|neutral|positive|suggestion"
    }
  ],
  "gaps": [
    {
      "flag": "MISSING|VAGUE|INCONSISTENT|REFORM|GOOD_PRACTICE|SECONDARY_RESOLVED|SECONDARY_OPEN",
      "text": "What's missing/vague/inconsistent/resolved, specifically, with enough detail to be useful. For INCONSISTENT, quote or summarize both sides and name which source said what."
    }
  ]
}
```

Aim for roughly 12-25 `findings`, 0-8 `quotes` (only if an FGD doc exists for this state), and 3-8 `gaps`.
Quality over quantity — skip anything you can't ground in the actual source text.
Do not include a `meta`/wrapper key — just this one object, valid JSON, nothing else in the file.
