const { Pool, types } = require('pg');

// Return DATE columns (OID 1082) as plain 'YYYY-MM-DD' strings.
// The default parser builds a local-midnight Date, which shifts the day on non-UTC servers.
types.setTypeParser(1082, (value) => value);

// DATABASE_URL example: postgres://thunderpeak:thunderpeak@localhost:5432/thunderpeak
// Render provides this for hosted Postgres. Hosted databases require SSL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
