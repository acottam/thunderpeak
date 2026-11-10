const { Pool } = require('pg');

// DATABASE_URL example: postgres://thunderpeak:thunderpeak@localhost:5432/thunderpeak
// Render provides this for hosted Postgres. Hosted databases require SSL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
