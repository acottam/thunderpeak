const pool = require('../db');

// Keep coordinate values as JSON numbers even when PostgreSQL returns NUMERIC strings.
function serializePark(park) {
  if (!park) return park;
  return {
    ...park,
    latitude: park.latitude === null ? null : Number(park.latitude),
    longitude: park.longitude === null ? null : Number(park.longitude),
    point_value: Number(park.point_value),
  };
}

// Return all parks in a stable order for the catalogue screen.
async function getParks() {
  const result = await pool.query(`
    SELECT id, name, description, location, park_code, designation,
           latitude, longitude, image_url, point_value, created_at, updated_at
    FROM parks
    ORDER BY name ASC
  `);
  return result.rows.map(serializePark);
}

// Return null when the requested database ID does not exist.
async function getParkById(id) {
  const result = await pool.query(`
    SELECT id, name, description, location, park_code, designation,
           latitude, longitude, image_url, point_value, created_at, updated_at
    FROM parks
    WHERE id = $1
  `, [id]);
  return serializePark(result.rows[0] || null);
}

module.exports = { getParks, getParkById };
