-- Cost of Regulation (CoR) — schema (Postgres / Neon)
-- Runs against whatever DATABASE_URL points at — Neon in production (via
-- Vercel's Postgres integration), a local Postgres instance in development.

CREATE TABLE IF NOT EXISTS licenses (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  definition TEXT
);

CREATE TABLE IF NOT EXISTS states (
  code TEXT NOT NULL,
  license_code TEXT NOT NULL REFERENCES licenses(code),
  name TEXT NOT NULL,
  ed_date TEXT, ed_location TEXT, ed_expert TEXT, ed_designation TEXT,
  issuing_authority TEXT,
  portal_name TEXT, portal_url TEXT,
  timeline_min INTEGER, timeline_max INTEGER, timeline_basis TEXT, timeline_text TEXT,
  automation_level TEXT, applicant_office_visit TEXT,
  deemed_status TEXT, deemed_days TEXT, deemed_text TEXT,
  validity_text TEXT, fees_text TEXT, documents_note TEXT,
  fgd_pending INTEGER NOT NULL DEFAULT 1,
  secondary_pending INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (code, license_code)
);

CREATE TABLE IF NOT EXISTS steps (
  id SERIAL PRIMARY KEY,
  state_code TEXT NOT NULL,
  license_code TEXT NOT NULL,
  n INTEGER NOT NULL,
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  automated TEXT, -- 'true' | 'false' | 'partial' | NULL
  note TEXT,
  documents_json TEXT, -- JSON array, only set on the step documents are actually submitted at
  FOREIGN KEY (state_code, license_code) REFERENCES states(code, license_code)
);
CREATE INDEX IF NOT EXISTS idx_steps_state ON steps(state_code, license_code);

CREATE TABLE IF NOT EXISTS remarks (
  id SERIAL PRIMARY KEY,
  state_code TEXT NOT NULL,
  license_code TEXT NOT NULL,
  ord INTEGER NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (state_code, license_code) REFERENCES states(code, license_code)
);

CREATE TABLE IF NOT EXISTS data_gaps (
  id SERIAL PRIMARY KEY,
  state_code TEXT NOT NULL,
  license_code TEXT NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (state_code, license_code) REFERENCES states(code, license_code)
);

CREATE TABLE IF NOT EXISTS fgd (
  state_code TEXT NOT NULL,
  license_code TEXT NOT NULL,
  meta TEXT, process TEXT, timeline TEXT, automation TEXT,
  documents_note TEXT, deemed TEXT,
  complaints_json TEXT, costs_json TEXT, contradictions_json TEXT,
  PRIMARY KEY (state_code, license_code)
);

CREATE TABLE IF NOT EXISTS secondary_research (
  state_code TEXT NOT NULL,
  license_code TEXT NOT NULL,
  confirms_json TEXT, contradicts_json TEXT, new_detail_json TEXT, sources_json TEXT,
  notes TEXT,
  pending INTEGER NOT NULL DEFAULT 1,
  last_run_id INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (state_code, license_code)
);

CREATE TABLE IF NOT EXISTS research_runs (
  id SERIAL PRIMARY KEY,
  state_code TEXT NOT NULL,
  license_code TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'running', -- running | done | failed
  summary TEXT,
  parsed_json TEXT,
  sources_json TEXT,
  raw_text TEXT,
  error TEXT,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_runs_state ON research_runs(state_code, license_code, triggered_at DESC);

CREATE TABLE IF NOT EXISTS admin (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
