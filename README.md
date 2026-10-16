# Cost of Regulation (CoR) — QCI · DPIIT

A real web application for the Cost of Regulation project: Quality Council of India's (QCI) assessment, for DPIIT, of the regulatory cost burden on businesses across India's 36 States/UTs and 26 licenses/services, under the CoR 2.0 framework (five cost types — time, substantive, intermediary, delay, statutory).

This pilot covers **Factory License** across the 11 States/UTs with a completed Expert Discussion (ED), with Focused Group Discussion (FGD) data for 5 of them, and an admin-triggerable secondary-research pipeline for all 11.

## What changed from the first cut

The project started as a single self-contained `index.html` file (still kept at [`legacy/static-dashboard.html`](./legacy/static-dashboard.html) for reference). It's now a real Node/Express + SQLite application with:

- A **database** instead of embedded JSON, so the data can grow past one license without re-architecting.
- **Admin-triggered secondary research**: a signed-in admin can click "Run secondary research" on any State's profile at any time. The backend calls Claude with real web-search tool access against official government sources, and the result — confirmed facts, contradictions, new detail, and citations — is written to the database and shown immediately, both on that State's profile and in a dedicated, append-only **Research Log**.
- **Combined, granular step data**: every process step now carries the specific documents required at that step (not a flat list disconnected from the process) and a link to the actual application portal where one has been independently confirmed.
- A genuinely interactive frontend: sortable tables, a live search/jump box, hover-driven detail, animated charts, and a redesigned Stage Comparison view that shows each State's full process with the selected stage highlighted in context, not just an isolated card.

## Running it locally

```bash
npm install
cp .env.example .env   # then edit .env — see "Environment variables" below
npm run seed            # creates and populates server/db/cor.sqlite
npm start                # or: npm run dev (auto-restarts on change)
```

Open `http://localhost:3000`.

## Running it with Docker

```bash
docker build -t cor-dashboard .
docker run -p 3000:3000 \
  -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD='change-me' \
  -e SESSION_SECRET='a-long-random-string' \
  -e ANTHROPIC_API_KEY='sk-ant-...' \
  cor-dashboard
```

**Note:** the Docker build itself was not runnable inside the sandboxed session this app was built in (no Docker daemon available there), so the `Dockerfile` has been exercised step-by-step manually (the same `npm install` and `npm run seed` it runs were run directly and verified), but not as an actual `docker build`. Please verify a real build on your end before relying on it, and tell me if anything doesn't come up cleanly.

For real hosting, point any Node-capable host (Render, Railway, Fly.io, a VPS, your own Kubernetes) at this `Dockerfile`, or run `npm start` directly behind your own reverse proxy. The SQLite database is a single file (`server/db/cor.sqlite`) — back it up like any other file; there is no separate database service to provision.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_USERNAME` | On first run only | Creates the single admin account the first time the server starts with an empty `admin` table. Defaults to `admin` if unset. |
| `ADMIN_PASSWORD` | On first run only | Same — without it, no admin account is created and admin features (triggering research) stay unreachable until you set it and restart. |
| `SESSION_SECRET` | Yes, in production | Signs the admin login session cookie. Any long random string; the app runs with an insecure default otherwise and logs a warning. |
| `ANTHROPIC_API_KEY` | For secondary research | **Your own key from [console.anthropic.com](https://console.anthropic.com)** — separate from whatever credential a Claude coding session used to build this app. Without it, the app works fully except that triggering secondary research fails immediately with a clear error, visible in the Research Log, telling you exactly this. |
| `RESEARCH_MODEL` | No | Defaults to `claude-opus-5-5`. Override only if you want a different model running the research calls. |
| `PORT` | No | Defaults to `3000`. |

The admin account is created once, on first boot, from `ADMIN_USERNAME`/`ADMIN_PASSWORD`. To change the password later, stop the server, delete the single row in the `admin` table of `server/db/cor.sqlite` (or just delete the whole file and re-seed), and restart with the new password set.

## How secondary research actually works

When an admin clicks "Run secondary research" on a State's profile:

1. The backend records a `research_runs` row with status `running` and returns immediately — the frontend polls for completion so the click never blocks the UI.
2. It calls the Anthropic Messages API with the `web_search` server tool enabled, giving Claude the State's current ED baseline (timeline, deemed approval, fees, portal, steps) and asking it to confirm, contradict, or extend that record using real government sources — citing everything, and saying plainly when something can't be verified online rather than guessing.
3. The structured result (confirms / contradicts / new detail / sources / a short synthesis) is parsed from Claude's response and written to the `secondary_research` table for that State, and the full run — including the raw response — is kept permanently in `research_runs` for the Research Log.

**ED and FGD are never overwritten by secondary research.** They're treated as the authoritative baseline, per this project's own convention (the field team's own description of them as "bible or gospel truth"). Secondary research sits alongside them as a third, independently-sourced account, and any disagreement between the three is surfaced explicitly — never silently resolved by picking one.

A single run is one Anthropic API call (with up to 8 web searches inside it) scoped to one State — it is not exhaustive legal research, and it costs real money per run (model + web search usage) on whichever Anthropic account `ANTHROPIC_API_KEY` belongs to.

## Project stages

1. **Field survey** — ED, FGD and allied data gathering (led by the fieldwork team; ongoing for Factory License and other licenses).
2. **Understanding the ED/FGD documents** — structuring the qualitative record (complete for this pilot).
3. **Secondary research** — now a live, admin-triggerable pipeline (see above) instead of a one-time pass, so the record can be refreshed as rules and portals change.
4. **Presentation** — the dashboard itself, extended as later stages complete.

## Extending to other licenses

`server/db/seed-data.json` → `server/db/enrich.cjs` → `server/db/seed-data.enriched.json` → `server/db/seed.cjs` is the full pipeline from raw structured data to the live database (`npm run seed` runs the last two steps). To add a new license:

1. Gather its ED/FGD documents (keep the originals somewhere version-controlled, e.g. a `sources/<license-code>/` folder in this repo).
2. Have Claude parse them into the same shape as `server/db/seed-data.json` (service/state/steps/fgd/etc.) for the new license code.
3. Run an enrichment pass equivalent to `enrich.cjs` (portal URLs, per-step documents) for the new license.
4. Re-run `npm run seed` — the schema and application code are already license-aware (every table is keyed by `license_code`); nothing else changes.

The `/api/licenses` and `/api/states?license=<code>` endpoints already support multiple licenses — the frontend's license switcher is currently disabled with only Factory License enabled, ready to turn on once a second license has data.
