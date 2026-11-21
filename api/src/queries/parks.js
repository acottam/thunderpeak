const pool = require('../db');

// Return all parks in a stable order for the catalogue screen.
async function getParks() {
  const result = await pool.query(`
    SELECT id, name, description, location, created_at, updated_at
    FROM parks
    ORDER BY name ASC
  `);
  return result.rows;
}

// Return null when the requested database ID does not exist.
async function getParkById(id) {
  const result = await pool.query(`
    SELECT id, name, description, location, created_at, updated_at
    FROM parks
    WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

module.exports = { getParks, getParkById };
