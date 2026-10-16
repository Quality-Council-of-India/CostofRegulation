require('dotenv').config();
const path = require('path');
const express = require('express');
const { ensureAdmin } = require('./services/auth');

const app = express();
app.use(express.json());

// ensureAdmin needs the database, so it can't run at module load in a
// serverless environment (cold starts must stay fast and DATABASE_URL may
// not even be reachable at import time). Run it lazily, once, before the
// first request that needs it.
let adminReady = null;
app.use((req, res, next) => {
  if (!adminReady) adminReady = ensureAdmin().catch(err => console.error('[auth] ensureAdmin failed:', err.message));
  adminReady.then(() => next()).catch(next);
});

app.use('/api', require('./routes/api'));
app.use('/api', require('./routes/admin'));

app.use(express.static(path.join(__dirname, '..', 'public')));
// Express 4 (path-to-regexp 0.1.x) wildcard syntax — '*' here, not the
// Express 5 '/{*splat}' form, which this app's pinned Express version
// would treat as a literal path rather than a catch-all.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Only bind a port for local development (`npm start` / `npm run dev`).
// On Vercel the exported `app` is wrapped as a single Fluid Compute
// function and never calls listen() itself.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Cost of Regulation dashboard listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
