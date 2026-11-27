const pool = require('../db');

// Points for a first sighting: base points times rarity, rounded (docs/api.md, Scoring rules).
const POINT_VALUE = 'ROUND(a.base_points * a.rarity_multiplier)::int';

// List every animal for the Wildlife screen, highest value first.
async function listAnimals() {
  const result = await pool.query(
    `SELECT a.id, a.name, a.base_points, a.rarity_multiplier,
            ${POINT_VALUE} AS point_value, a.description
     FROM animals a
     ORDER BY point_value DESC, a.name`,
  );
  return result.rows;
}

// Log a sighting on one of the user's visits and read its award from scored_sightings
// (migration 002). Returns { visitNotFound }, { animalNotFound } or { duplicate } instead of
// throwing for the expected cases, the same pattern as createVisit.
async function createSighting(userId, visitId, animalId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Another user's visit looks the same as a missing one, so ids can't be probed.
    const visit = await client.query(
      'SELECT id FROM visits WHERE id = $1 AND user_id = $2', [visitId, userId],
    );
    if (!visit.rows[0]) {
      await client.query('ROLLBACK');
      return { visitNotFound: true };
    }

    const animal = await client.query('SELECT name FROM animals WHERE id = $1', [animalId]);
    if (!animal.rows[0]) {
      await client.query('ROLLBACK');
      return { animalNotFound: true };
    }

    // The unique (visit_id, animal_id) constraint reports a duplicate as error 23505.
    let inserted;
    try {
      inserted = await client.query(
        `INSERT INTO visit_animal_sightings (visit_id, animal_id)
         VALUES ($1, $2)
         RETURNING id`,
        [visitId, animalId],
      );
    } catch (error) {
      if (error.code === '23505') {
        await client.query('ROLLBACK');
        return { duplicate: true };
      }
      throw error;
    }

    const result = await client.query(
      `SELECT ss.id, ss.visit_id, ss.animal_id, a.name, ss.points_awarded,
              (SELECT (max(awarded.visited_date) FILTER (WHERE awarded.earns_points)
                       + INTERVAL '12 months')::date
               FROM scored_sightings awarded
               WHERE awarded.user_id = ss.user_id
                 AND awarded.park_id = ss.park_id
                 AND awarded.animal_id = ss.animal_id) AS next_eligible_date
       FROM scored_sightings ss
       JOIN animals a ON a.id = ss.animal_id
       WHERE ss.id = $1`,
      [inserted.rows[0].id],
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { listAnimals, createSighting };
