# Cost of Regulation (CoR) — QCI · DPIIT

Working repository for the Cost of Regulation project: Quality Council of India's (QCI) assessment, for DPIIT, of the regulatory cost burden on businesses across India's 36 States/UTs and 26 licenses/services, under the CoR 2.0 framework (five cost types — time, substantive, intermediary, delay, statutory).

## What's here

**[`index.html`](./index.html)** — a self-contained dashboard (no build step, no server; open the file directly in a browser) comparing the **Factory License** process across the 11 States/UTs where an Expert Discussion (ED) has been completed, with Focused Group Discussion (FGD) data layered in for the 5 States/UTs where it exists, and independent secondary-research verification layered in for all 11. This is the pilot license for the project, chosen to build and validate the single-window comparison approach before extending it to the remaining licenses. Use the "Download report" button on any tab to save it as a PDF via the browser's print dialog.

The dashboard has seven views:
1. **National overview** — steps, timeline, automation, documents, deemed approval, compared across all 11 States/UTs.
2. **State profile** — the full step-by-step process for one State/UT as a visual stepper, with three reconciled sources (official ED record, business/user FGD account, independent secondary research) and every logged disagreement between them.
3. **Compare States** — line up 2–4 States/UTs side by side across every KPI and their full process.
4. **Stage comparison** — one process stage (e.g. inspection, fee & payment), grouped by how automated it is, across every State/UT.
5. **Best practices** — which State leads on each KPI and why, plus a curated catalog of specific practices worth replicating.
6. **Official vs. lived experience** — a dedicated, project-wide log of every point where the official account and business experience disagree.
7. **Method & data quality** — the CoR 2.0 cost-type definitions, what stage of the project this pilot represents, how it scales to other licenses, and every data gap flagged rather than guessed at.

Every figure in the dashboard is sourced directly from the project's Expert Discussion and Focused Group Discussion documents for Factory License, or from independently-cited secondary research (state Factories Rules, gazette notifications, citizen-charter/portal documentation) — nothing is simulated or illustrative. Where a source does not give a figure, or sources disagree, the dashboard shows that explicitly rather than guessing or silently picking one.

A physical site inspection is shown as a distinct, neutral "on-site visit" status rather than being penalised the same way a genuine friction point (e.g. a required office visit) is — inspection is a safety control present in nearly every State, not a process failure.

## Project stages

1. **Field survey** — ED, FGD and allied data gathering (led by the fieldwork team; ongoing for Factory License and other licenses). ED and FGD are treated as the authoritative baseline record, per this project's own convention.
2. **Understanding the ED/FGD documents** — structuring the qualitative record (complete for this pilot).
3. **Secondary research** — validating, extending and catching drift against each State's own rules, notifications and portals. Done once for this pilot (all 11 States); see "Keeping this current" below for how it should be kept from going stale.
4. **Presentation** — comprehensive inter-state comparison and findings (this dashboard, extended as later stages complete).

## Extending to other licenses

Recommended repo layout, so the dashboard can grow without re-architecting each time:
- `/sources/<license-code>/ED/<state>.docx` and `/sources/<license-code>/FGD/<state>.docx` — the original field documents, version-controlled exactly as received.
- `/data/<license-code>.js` — the structured, schema-consistent data the dashboard reads (today embedded directly in `index.html` for Factory License; splitting it out is the natural next step once a second license is added).

The data schema (per-state: steps, timeline, automation, documents, deemed approval, validity, fees, remarks, data gaps, FGD overlay, secondary-research overlay) is deliberately uniform across States from the start — the opposite of the inconsistent per-state spreadsheet template used in earlier work on Electricity Connection.

**On uploading documents directly to the dashboard.** A static HTML file like this one cannot write files back into the repository or reliably parse a dropped Word document in-browser, so a client-side "upload" button would only preview a file locally and lose it on refresh — it would not actually get a new license's data into the dashboard. The workflow that scales: add new ED/FGD documents to `/sources` (via this repo, or a shared drive QCI maintains), then have Claude parse them into the structured schema and commit the result to `/data`, the same way this pilot was built. That preserves the rigor the pilot was built with (locked schema, flagged gaps, no fabricated figures) instead of trading it for a fragile in-browser parser.

**Keeping this current.** A static dashboard cannot re-research itself. What can be set up is a scheduled, recurring check — e.g. quarterly — where Claude re-runs the secondary-research pass per State and license, flags anything that has drifted from the ED/FGD baseline, and republishes. That has an ongoing cost and a cadence to choose, so it is a deliberate option to turn on, not something to assume is already running.
