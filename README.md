# Cost of Regulation (CoR) — QCI · DPIIT

Working repository for the Cost of Regulation project: Quality Council of India's (QCI) assessment, for DPIIT, of the regulatory cost burden on businesses across India's 36 States/UTs and 26 licenses/services, under the CoR 2.0 framework (five cost types — time, substantive, intermediary, delay, statutory).

## What's here

**[`index.html`](./index.html)** — a self-contained dashboard (no build step, no server; open the file directly in a browser) comparing the **Factory License** process across the 11 States/UTs where an Expert Discussion (ED) has been completed, with Focused Group Discussion (FGD) data layered in for the 5 States/UTs where it exists. This is the pilot license for the project, chosen to build and validate the single-window comparison approach before extending it to the remaining licenses.

The dashboard has five views:
1. **National overview** — steps, timeline, automation, documents, deemed approval, compared across all 11 States/UTs.
2. **State profile** — full step-by-step process for one State/UT, with the official (ED) record and the business/user (FGD) account shown side by side, including explicit contradiction flags.
3. **Stage comparison** — one process stage (e.g. inspection, fee & payment) compared across every State/UT.
4. **Official vs. lived experience** — a dedicated log of every point where the official account and business experience disagree.
5. **Method & data quality** — the CoR 2.0 cost-type definitions, what stage of the project this pilot represents, and every data gap flagged rather than guessed at.

Every figure in the dashboard is sourced directly from the project's Expert Discussion and Focused Group Discussion documents for Factory License — nothing is simulated or illustrative. Where a source document does not give a figure, the dashboard shows that explicitly as a data gap.

## Project stages

1. **Field survey** — ED, FGD and allied data gathering (led by the fieldwork team; ongoing for Factory License and other licenses).
2. **Understanding the ED/FGD documents** — structuring the qualitative record (this pilot dashboard).
3. **Secondary research** — validating findings against each State's own rules/notifications (not yet run for Factory License — see the Method tab for the list of flagged gaps this stage should resolve).
4. **Presentation** — comprehensive inter-state comparison and findings (this dashboard, extended as later stages complete).

## Extending to other licenses

The dashboard's data schema (per-state: steps, timeline, automation, documents, deemed approval, validity, fees, remarks, data gaps, optional FGD overlay) is deliberately uniform across States from the start — the opposite of the inconsistent per-state spreadsheet template used in earlier work on Electricity Connection. The same schema and view structure can be reused for the remaining 25 licenses/services as their ED/FGD documents become available.
