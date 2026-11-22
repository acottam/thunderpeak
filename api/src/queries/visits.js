const pool = require('../db');

// Record a check-in and return its current score and next reward date from scored_visits.
async function createVisit(userId, parkId, visitedDate) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const park = await client.query('SELECT name FROM parks WHERE id = $1', [parkId]);
    if (!park.rows[0]) {
      await client.query('ROLLBACK');
      return { notFound: true };
    }

    if (visitedDate) {
      const dateCheck = await client.query(
        'SELECT $1::date > CURRENT_DATE AS is_future', [visitedDate],
      );
      if (dateCheck.rows[0].is_future) {
        await client.query('ROLLBACK');
        return { invalidDate: true };
      }
    }

    const inserted = await client.query(
      `INSERT INTO visits (user_id, park_id, visited_date)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE))
       RETURNING id`,
      [userId, parkId, visitedDate],
    );

    const result = await client.query(
      `SELECT sv.id, sv.park_id, p.name AS park_name, sv.visited_date,
              sv.points_awarded,
              (SELECT (max(awarded.visited_date) FILTER (WHERE awarded.earns_points)
                       + INTERVAL '12 months')::date
               FROM scored_visits awarded
               WHERE awarded.user_id = sv.user_id AND awarded.park_id = sv.park_id)
                AS next_eligible_date
       FROM scored_visits sv
       JOIN parks p ON p.id = sv.park_id
       WHERE sv.id = $1`,
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

// Return the signed-in user's scored check-ins, optionally filtered by park.
async function getUserVisits(userId, parkId = null) {
  const result = await pool.query(
    `SELECT sv.id, sv.park_id, p.name AS park_name, sv.visited_date,
            sv.points_awarded
     FROM scored_visits sv
     JOIN parks p ON p.id = sv.park_id
     WHERE sv.user_id = $1 AND ($2::int IS NULL OR sv.park_id = $2)
     ORDER BY sv.visited_date DESC, sv.id DESC`,
    [userId, parkId],
  );
  return result.rows;
}

// Calculate visit counts and reward eligibility from the scoring view.
async function getUserParkStatus(userId, parkId) {
  const result = await pool.query(
    `SELECT count(*)::int AS visit_count,
            max(visited_date) AS last_visited_date,
            max(visited_date) FILTER (WHERE earns_points) AS last_awarded_date,
            (max(visited_date) FILTER (WHERE earns_points) + INTERVAL '12 months')::date
              AS next_eligible_date,
            coalesce(current_date >=
              (max(visited_date) FILTER (WHERE earns_points) + INTERVAL '12 months')::date,
              true) AS can_earn_points_now
     FROM scored_visits
     WHERE user_id = $1 AND park_id = $2`,
    [userId, parkId],
  );
  return result.rows[0];
}

// Return aggregate totals from user_scores, including zeroes for a new account.
async function getUserScore(userId) {
  const result = await pool.query(
    `SELECT total_points, visit_count
     FROM user_scores
     WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] || { total_points: 0, visit_count: 0 };
}

// Check park existence separately so an unvisited park still gets a status response.
async function parkExists(parkId) {
  const result = await pool.query('SELECT 1 FROM parks WHERE id = $1', [parkId]);
  return result.rowCount > 0;
}

module.exports = { createVisit, getUserVisits, getUserParkStatus, getUserScore, parkExists };
