const pool = require('../db');

// Insert a user. A duplicate username raises Postgres error 23505 (the route turns it into a 409).
async function createUser(username, passwordHash) {
  const result = await pool.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username`,
    [username, passwordHash],
  );
  return result.rows[0];
}

// Includes password_hash. Use only for checking a login, never send it to the client.
async function findUserByUsername(username) {
  const result = await pool.query(
    'SELECT id, username, password_hash FROM users WHERE username = $1',
    [username],
  );
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

module.exports = { createUser, findUserByUsername, findUserById };
