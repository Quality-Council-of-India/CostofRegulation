require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const { ensureAdmin } = require('./services/auth');

ensureAdmin();

const app = express();
app.use(express.json());

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.warn('[server] SESSION_SECRET is not set — using an insecure default. Set it in production.');
}
app.use(session({
  secret: sessionSecret || 'dev-insecure-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 12, sameSite: 'lax' }
}));

app.use('/api', require('./routes/api'));
app.use('/api', require('./routes/admin'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cost of Regulation dashboard listening on http://localhost:${PORT}`);
});
