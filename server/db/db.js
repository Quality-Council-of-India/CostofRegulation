const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'cor.sqlite');

if (!fs.existsSync(DB_PATH)) {
  throw new Error(
    `Database not found at ${DB_PATH}. Run "npm run seed" first to create and populate it.`
  );
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

module.exports = db;
