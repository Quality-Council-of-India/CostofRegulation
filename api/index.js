// Vercel's classic /api convention: any file here exporting a request
// handler becomes a serverless function. We export the whole Express app
// and let vercel.json's rewrite send every request to it, so the app's own
// routing (both /api/* and the static frontend) works unchanged from how
// it runs locally with `npm start`.
module.exports = require('../server/server.js');
