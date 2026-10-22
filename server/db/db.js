const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. In production this comes from Vercel\'s Postgres (Neon) ' +
    'integration automatically; for local development, set it in .env to a local or ' +
    'remote Postgres connection string (e.g. postgres://user:pass@localhost:5432/cordashboard).'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

module.exports = pool;
