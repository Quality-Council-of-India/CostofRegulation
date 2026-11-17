# Cost of Regulation (CoR) — QCI · DPIIT

The Cost of Regulation project: Quality Council of India's (QCI) assessment, for DPIIT, of the regulatory cost burden on businesses across India's 36 States/UTs and 24+ licenses/services, under the CoR 2.0 framework (five cost types — time, substantive, intermediary, delay, statutory).

**Current scope: 344 license records — 35 States/UTs × up to 25 license types.** Three sources sit behind the dashboard, and they are never blended:

| Lane | What it is | Coverage |
|---|---|---|
| **ED** — Expert Discussion | Field interviews with the official who issues the licence in that State | the authoritative account of the process as run |
| **FGD** — Focused Group Discussion | Field sessions with businesses who went through that exact process | 267 records carry FGD evidence |
| **RULES** — published rules | Independent desk check of specific facts against the State's own gazette notifications, rules and portals, each with the exact URL fetched | Factory License pilot |

The field survey phase is **closed**, so gaps in the ED/FGD record can no longer be resolved by going back to the field. That is why the third lane exists: it verifies specific facts rather than acting as a parallel dataset. Each checked fact gets one of four verdicts — `confirmed`, `contradicted`, `fills_gap`, or `not_found` — and a record with no check at all is shown as *not yet checked*, which is deliberately never the same as *checked and found wrong*.

## The primary deliverable: `cor-dashboard.html`

**Open `cor-dashboard.html` directly in a browser — no server, no install, no setup.** A single self-contained file (7,118 tagged findings, 1,678 business quotes and 2,102 gap flags embedded in it) that you can open locally, email, or host anywhere as a static file.

It is organised as a portal with chaptered navigation — **Start here**, then *The big picture* (national overview, pain points, good practice & reform), *Compare States* (side-by-side, step equivalence, one stage across every State), *One State in depth*, and *Evidence & method* (where sources disagree, what we still don't know, method & sources). Every page opens with a plain-English finding rather than a label, and visuals carry a "How to read" line, so a non-specialist can follow it without a briefing.

Two things worth knowing about the analysis:

- **Step equivalence.** A raw step count is not a fair comparison — one State writes "upload documents and pay the fee" as one step where another writes three. Every Factory License State's real step text was mapped to a shared 14-stage checklist, so the dashboard can show a *comparable* count alongside the listed one. 12 of 22 States turn out to describe fewer steps than they actually perform.
- **Gap flags.** `MISSING`, `VAGUE`, `INCONSISTENT`, `GOOD_PRACTICE`, `REFORM` — recorded rather than filled in. Nothing in the dataset is an estimate.

To rebuild after any data change: `node scripts/build-multi-dashboard.js` — reads `scripts/ed_data/<STATE>.json`, `scripts/fgd_data/<STATE>.json`, `scripts/secondary_data/<STATE>.json`, `scripts/step_equivalence/<LICENSE>.json` plus `services.json` / `states.json` / `phase-template.json`, merges them, injects into `scripts/dashboard-multi.template.html`, and writes `cor-dashboard.html`.

### The earlier Factory-License-only pilot

The original 11-State Factory License pilot — with secondary (web) research already baked in — is a separate, still-valid build: `node scripts/build-dashboard.js` (reads `scripts/tagged/*.json` + `server/db/seed-data.json`, injects into `scripts/dashboard.template.html`). It is **not** what `cor-dashboard.html` currently is (the multi-license build above has superseded it as the main file at the repo root), but its richer per-state secondary-research data for those 11 States is preserved in the repo and is the basis for re-layering secondary research back into the full multi-license dataset.

## The web app (parked, not the active deliverable)

An earlier phase of this project also built a full Node/Express + Postgres web app — with admin login and a live, on-demand secondary-research trigger backed by the Anthropic API — deployable to Vercel. That code is still in this repository (`server/`, `public/`, `api/`, `vercel.json`) and still works, but it is **not** the current deliverable: the project deliberately moved to the single-file format above, since a one-off, periodically-regenerated file needs no hosting, login, or database to keep running. The deployment instructions below are kept for if an always-on, continuously-refreshed version is wanted later.

## Deploying the web app to Vercel — step by step (optional, not currently used)

This app is set up to deploy on Vercel: a Node/Express backend running as a single Vercel Function (`api/index.js`), a Postgres database via Vercel's built-in Neon integration (no separate account needed), and the frontend served as static files.

**1. Push this branch to GitHub (if not already).** The repo is `quality-council-of-india/costofregulation`. This work is on `claude/elegant-hamilton-1or6rs` — Vercel can deploy from any branch, but if you want this to be the live production site long-term, either merge it to your default branch or set Vercel's **Production Branch** (Project Settings → Git) to this branch.

**2. Import the project in Vercel.**
- Go to your Vercel dashboard → **Add New** → **Project**.
- Choose **Import Git Repository** and select `quality-council-of-india/costofregulation`. If it's not listed, click "Adjust GitHub App Permissions" and grant Vercel access to the QCI org/this repo.
- Framework Preset: leave as **Other** (there's no build step — this isn't a Next.js/React app).
- Leave Build Command and Output Directory blank/default.
- Don't deploy yet — add the database first (next step), or deploy now and redeploy after; either works.

**3. Add a Postgres database (Vercel's Neon integration).**
- In the project, go to the **Storage** tab → **Create Database** → **Postgres** (Neon-powered).
- Follow the prompts to create it and connect it to this project. Vercel will automatically inject `DATABASE_URL` (and a few related variables) into your project's environment variables — you don't set this one by hand.

**4. Set the remaining environment variables.** Project Settings → **Environment Variables**, add for Production (and Preview, if you want preview deployments to work too):

| Variable | Value |
|---|---|
| `ADMIN_USERNAME` | Whatever username you want to sign in with (e.g. `admin`) |
| `ADMIN_PASSWORD` | A real password — this creates the one admin account the first time the app starts with an empty `admin` table |
| `SESSION_SECRET` | Any long random string (e.g. generate one with `openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | **Your own key from [console.anthropic.com](https://console.anthropic.com)** — separate from any credential used to build this app. Without it, everything else works, but clicking "Run secondary research" fails immediately with a clear error in the Research Log telling you exactly this. |

**5. Deploy.** Click **Deploy** (or push a commit — Vercel auto-deploys on push once connected). First deploy will fail to show any data because the database schema/seed hasn't run yet — that's expected, do the next step.

**6. Seed the database — once.** The database starts empty; `npm run seed` creates the tables and loads the Factory License dataset. Run it once against your production database:
- Easiest: on your own machine, `git clone` the repo, `npm install`, set `DATABASE_URL` in a local `.env` to the **same** connection string Vercel is using (copy it from Project Settings → Environment Variables → `DATABASE_URL` → reveal value), then run `npm run seed`.
- You only need to do this once (and again if you ever want to reset/reload the base dataset — it leaves `research_runs` and the `admin` table alone, so you won't lose research history or have to re-set the admin password).

**7. Open the deployed URL.** You should see the dashboard with data. Sign in with the admin credentials you set in step 4 to try "Run secondary research" on a State.

### What I could and couldn't verify myself

I don't have network access to vercel.com from this environment, so I could not actually run `vercel deploy` or `vercel dev` against your account — the walkthrough above is accurate to Vercel's documented conventions (the classic `/api` directory + `vercel.json` rewrite pattern, and the current Neon/Postgres integration flow), and I verified the parts that don't require Vercel itself:

- Simulated exactly how Vercel's Node runtime invokes `api/index.js` (a raw `http.createServer` calling the exported Express app, bypassing `app.listen()`) and confirmed the API, the static frontend, and static JS/CSS all serve correctly through it.
- Ran the full app end-to-end against a real local Postgres database (schema creation, seeding, every view, admin login, and the research-trigger pipeline including its graceful failure path when `ANTHROPIC_API_KEY` is missing).

What I could not verify: the actual Vercel build/deploy process, the real Neon integration's exact environment variable names in your account (confirm `DATABASE_URL` is what shows up after connecting — Neon's docs say this is the default, but check your project's Environment Variables tab after connecting rather than assuming), and real-world function cold-start/timeout behavior. If the first deploy doesn't come up cleanly, send me the Vercel build/function log and I'll fix it.

## Running it locally

```bash
npm install
cp .env.example .env   # then edit .env — see "Environment variables" below
npm run seed            # creates tables and populates them in your Postgres DB
npm start                # or: npm run dev (auto-restarts on change)
```

Open `http://localhost:3000`. You'll need a Postgres database to point `DATABASE_URL` at — either a local install (`createdb cordashboard`, then `DATABASE_URL=postgres://localhost/cordashboard`) or a free Neon project of your own (neon.tech) for local development against the same kind of database production uses.

## Running it with Docker (self-hosting alternative to Vercel)

```bash
docker build -t cor-dashboard .
docker run -p 3000:3000 \
  -e DATABASE_URL='postgres://...' \
  -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD='change-me' \
  -e SESSION_SECRET='a-long-random-string' \
  -e ANTHROPIC_API_KEY='sk-ant-...' \
  cor-dashboard
# then once, the first time:
docker exec <container-id> npm run seed
```

**Note:** the Docker build itself was not runnable inside this sandboxed session either (no Docker daemon available here) — flagged here rather than claimed as verified, same as the Vercel deploy above. Every step it runs (`npm install`, running the compiled app) was exercised directly and works; the containerization itself just wasn't.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. Auto-set by Vercel's Neon integration in production; set it yourself for local dev or Docker. |
| `ADMIN_USERNAME` | On first run only | Creates the single admin account the first time the server starts with an empty `admin` table. Defaults to `admin` if unset. |
| `ADMIN_PASSWORD` | On first run only | Same — without it, no admin account is created and admin features (triggering research) stay unreachable until you set it and redeploy/restart. |
| `SESSION_SECRET` | Yes, in production | Signs the admin login cookie (a small HMAC-signed token, not a server-side session store — see "Why no express-session" below). Any long random string. |
| `ANTHROPIC_API_KEY` | For secondary research | **Your own key from [console.anthropic.com](https://console.anthropic.com)**. Without it, the app works fully except that triggering secondary research fails immediately with a clear error, visible in the Research Log. |
| `RESEARCH_MODEL` | No | Defaults to `claude-opus-5-5`. |
| `PORT` | No, local only | Defaults to `3000`. Not used on Vercel. |

To change the admin password later: update `ADMIN_PASSWORD` in your environment, then delete the single row in the `admin` table (`DELETE FROM admin;` via `psql` or Neon's SQL editor) so it gets recreated from the new value on the next request.

## How secondary research actually works

When a signed-in admin clicks "Run secondary research" on a State's profile:

1. The backend records a `research_runs` row with status `running` and returns immediately — the frontend polls for completion so the click never blocks the UI.
2. It calls the Anthropic Messages API with the `web_search` server tool enabled, giving Claude the State's current ED baseline (timeline, deemed approval, fees, portal, steps) and asking it to confirm, contradict, or extend that record using real government sources — citing everything, and saying plainly when something can't be verified online rather than guessing.
3. On Vercel, this background work is kept alive past the HTTP response using `waitUntil` from `@vercel/functions` (a serverless function is otherwise killed once its response is sent) — this was the single biggest behavioral difference from the original self-hosted design, now handled explicitly rather than silently broken.
4. The structured result (confirms / contradicts / new detail / sources / a short synthesis) is parsed from Claude's response and written to the `secondary_research` table, and the full run is kept permanently in `research_runs` for the Research Log.

**ED and FGD are never overwritten by secondary research.** They're treated as the authoritative baseline, per this project's own convention. Secondary research sits alongside them as a third, independently-sourced account, and any disagreement is surfaced explicitly — never silently resolved.

A single run is one Anthropic API call (with up to 8 web searches inside it) scoped to one State — it is not exhaustive legal research, and it costs real money per run on whichever Anthropic account `ANTHROPIC_API_KEY` belongs to.

## Why no express-session

The original self-hosted design used `express-session` with its default in-memory store. That doesn't work on Vercel: each serverless invocation can run in a different, isolated process, so "session state held in server memory" simply doesn't exist from one request to the next. Rather than add a session-store dependency (Redis, a sessions table, etc.) for a single-admin login, the app signs a small token (`{username, expiry}` + an HMAC signature) and stores it in an httpOnly cookie — verified statelessly on each request against `SESSION_SECRET`, no server-side storage at all. See `server/services/auth.js`.

## Project stages

1. **Field survey** — ED, FGD and allied data gathering (led by the fieldwork team; ongoing for Factory License and other licenses).
2. **Understanding the ED/FGD documents** — structuring the qualitative record, then tagging every finding against the taxonomy in `scripts/taxonomy.md` (complete for this pilot).
3. **Secondary research** — an independent, web-search-backed verification pass per State, explicitly tracked against the gaps ED/FGD alone leave open (`SECONDARY_RESOLVED` vs. `SECONDARY_OPEN` — see the "Closing the gap" view). Currently a point-in-time pass baked into `cor-dashboard.html`; the parked web app (above) additionally supports re-running it live, on demand, per State.
4. **Presentation** — `cor-dashboard.html`, rebuilt from `scripts/build-dashboard.js` as the underlying data is extended.

## Extending `cor-dashboard.html` — adding States or a new license

This is the real, working pipeline behind the primary (multi-license) deliverable:

```
scripts/ed_data/<CODE>.json   (one file per State — every license's ED extraction: structured fields + tagged findings/gaps)
scripts/services.json         (canonical license catalog)
scripts/states.json           (canonical State/UT universe)
scripts/phase-template.json   (7-stage process taxonomy)
        │
        ▼  node scripts/build-multi-dashboard.js
        │
cor-dashboard.html  (self-contained, data embedded)
```

`scripts/ed-extraction-spec.md` defines the exact per-license JSON shape for ED records (steps, timeline, fees, validity, deemed approval, documents, tagged findings, gap flags). `scripts/fgd-extraction-spec.md` defines the FGD extraction rules: cross-check against the matching `scripts/ed_data/<CODE>.json` entry first — if an ED record exists for that State/license (Mode A), add only `findings`/`quotes`/`gaps` alongside it (never overwrite ED's structured fields) and flag any genuine ED-vs-FGD factual contradiction as `INCONSISTENT` with both sides quoted; if no ED record exists (Mode B), produce a full best-effort structured record from FGD testimony alone, marked `hasED: false`. `scripts/service-codes.md` defines every license abbreviation (now 25, including LR/Lift Registration).

To add a State's ED or FGD for a license it doesn't yet have, or a State that isn't in the dataset at all:

1. Get the real ED and/or FGD transcript (`.docx` → `pandoc <file> -t plain -o <file>.txt`, or `.pdf` read directly).
2. For ED: add (or extend) `scripts/ed_data/<CODE>.json` for that State, following `scripts/ed-extraction-spec.md` exactly. For FGD: add (or extend) `scripts/fgd_data/<CODE>.json`, following `scripts/fgd-extraction-spec.md` exactly (checking the matching ED entry first, per Mode A/Mode B above). Have Claude read the real transcript directly and produce this — do not derive it from a summary or from another State's entry; ground every fact, figure, step and quote in the actual document, and flag genuinely missing/vague/inconsistent information with a gap rather than guessing.
3. If it's a genuinely new State, add its code/name to `scripts/states.json` too (the `code` in `scripts/ed_data/<CODE>.json` / `scripts/fgd_data/<CODE>.json` must match).
4. Run `node scripts/build-multi-dashboard.js` — it rebuilds `cor-dashboard.html` from scratch, picking up every file under `scripts/ed_data/` and `scripts/fgd_data/` and merging them.
5. Open the rebuilt file, jump to the new State/license, and spot-check the steps, findings, quotes and gaps before sharing it onward.

To change the page's layout, styling, or add a new view: edit `scripts/dashboard-multi.template.html` (the actual source — never hand-edit `cor-dashboard.html` itself, since it's a generated file and your edit will be lost on the next rebuild), then re-run the build script.

### Re-integrating secondary research

Once a fresh secondary-research pass exists for a State/license, the taxonomy already has flags ready for it (`source: "secondary"`, and `SECONDARY_RESOLVED`/`SECONDARY_OPEN` gap flags — see `scripts/taxonomy.md`, written for the original Factory License pilot and still the right reference). The work is: extend that license's entry in `scripts/ed_data/<CODE>.json` with the new findings/gaps, then rebuild.

## Extending the parked web app to other licenses (optional)

`server/db/seed-data.json` → `server/db/enrich.cjs` → `server/db/seed-data.enriched.json` → `server/db/seed.cjs` is the full pipeline from raw structured data to the live database (`npm run seed` runs the last two steps), for the parked web app only:

1. Gather its ED/FGD documents (keep the originals somewhere version-controlled, e.g. a `sources/<license-code>/` folder in this repo).
2. Have Claude parse them into the same shape as `server/db/seed-data.json` (service/state/steps/fgd/etc.) for the new license code.
3. Run an enrichment pass equivalent to `enrich.cjs` (portal URLs, per-step documents) for the new license.
4. Re-run `npm run seed` — the schema and application code are already license-aware (every table is keyed by `license_code`); nothing else changes.

The `/api/licenses` and `/api/states?license=<code>` endpoints already support multiple licenses — the frontend's license switcher is currently disabled with only Factory License enabled, ready to turn on once a second license has data.
