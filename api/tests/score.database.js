const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');

test('park scoring migration and queries', async (t) => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const schema = `score_test_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    await client.query(await readFile(path.join(root, 'schema.sql'), 'utf8'));

    await client.query("INSERT INTO users (username, password_hash) VALUES ('old_user', 'disabled')");
    await client.query("INSERT INTO parks (name) VALUES ('Existing Park')");
    await client.query("INSERT INTO visits (user_id, park_id, visited_date) VALUES (1, 1, '2024-01-01')");

    const migration = await readFile(path.join(root, 'migrations/001-park-scoring.sql'), 'utf8');
    await client.query(migration);
    await client.query(migration);

    await t.test('preserves existing rows and treats missing park points as zero', async () => {
      const { rows } = await client.query('SELECT total_points, visit_count FROM user_scores WHERE user_id = 1');
      assert.deepEqual(rows[0], { total_points: '0', visit_count: '1' });
    });

    await t.test('validates park codes, coordinates and point values', async () => {
      await client.query("UPDATE parks SET park_code = 'existing' WHERE id = 1");
      for (const sql of [
        "INSERT INTO parks (name, park_code) VALUES ('Duplicate code', 'existing')",
        "UPDATE parks SET latitude = 91 WHERE id = 1",
        "UPDATE parks SET longitude = -181 WHERE id = 1",
        "UPDATE parks SET point_value = -1 WHERE id = 1",
      ]) {
        await client.query('SAVEPOINT invalid_park');
        await assert.rejects(client.query(sql));
        await client.query('ROLLBACK TO SAVEPOINT invalid_park');
      }
    });

    await t.test('awards points at the 12-month boundary and saves repeat visits', async () => {
      await client.query('UPDATE parks SET point_value = 50 WHERE id = 1');
      await client.query(`INSERT INTO visits (user_id, park_id, visited_date) VALUES
        (1, 1, '2024-12-31'), (1, 1, '2025-01-01'), (1, 1, '2025-01-01')`);
      const { rows } = await client.query(`
        SELECT visited_date::text, earns_points, points_awarded
        FROM scored_visits ORDER BY visited_date, id
      `);
      assert.deepEqual(rows, [
        { visited_date: '2024-01-01', earns_points: true, points_awarded: 50 },
        { visited_date: '2024-12-31', earns_points: false, points_awarded: 0 },
        { visited_date: '2025-01-01', earns_points: true, points_awarded: 50 },
        { visited_date: '2025-01-01', earns_points: false, points_awarded: 0 },
      ]);
    });

    await t.test('recalculates later awards after a backdated visit', async () => {
      await client.query("INSERT INTO visits (user_id, park_id, visited_date) VALUES (1, 1, '2023-06-01')");
      const { rows } = await client.query(`
        SELECT visited_date::text, earns_points FROM scored_visits ORDER BY visited_date, id
      `);
      assert.deepEqual(rows.map((row) => row.earns_points), [true, false, true, false, false]);
      assert.equal(rows[2].visited_date, '2024-12-31');
    });

    let anotherParkId;
    await t.test('scores each user and park independently, including users with no visits', async () => {
      await client.query("INSERT INTO users (username, password_hash) VALUES ('another_user', 'disabled'), ('no_visits', 'disabled')");
      const park = await client.query("INSERT INTO parks (name, point_value) VALUES ('Another Park', 15) RETURNING id");
      anotherParkId = park.rows[0].id;
      await client.query(`INSERT INTO visits (user_id, park_id, visited_date) VALUES
        (1, $1, '2024-01-01'), (2, 1, '2024-01-01')`, [anotherParkId]);
      const { rows } = await client.query('SELECT username, total_points, visit_count FROM user_scores ORDER BY total_points DESC, username');
      assert.deepEqual(rows, [
        { username: 'old_user', total_points: '115', visit_count: '6' },
        { username: 'another_user', total_points: '50', visit_count: '1' },
        { username: 'no_visits', total_points: '0', visit_count: '0' },
      ]);
    });

    await t.test('reflects corrections to a park value in existing scores', async () => {
      await client.query('UPDATE parks SET point_value = 25 WHERE id = 1');
      const { rows } = await client.query('SELECT total_points FROM user_scores WHERE user_id = 1');
      assert.equal(rows[0].total_points, '65');
    });

    await t.test('handles leap-day anniversaries using PostgreSQL date arithmetic', async () => {
      await client.query(`INSERT INTO visits (user_id, park_id, visited_date) VALUES
        (2, $1, '2024-02-29'), (2, $1, '2025-02-27'), (2, $1, '2025-02-28')`, [anotherParkId]);
      const { rows } = await client.query(`
        SELECT earns_points FROM scored_visits
        WHERE user_id = 2 AND park_id = $1 ORDER BY visited_date, id
      `, [anotherParkId]);
      assert.deepEqual(rows.map((row) => row.earns_points), [true, false, true]);
    });

    await t.test('local sample data can be loaded twice without duplicate visits', async () => {
      const sample = await readFile(path.join(root, 'sample-visits.sql'), 'utf8');
      await client.query(sample);
      await client.query(sample);
      const { rows } = await client.query("SELECT total_points, visit_count FROM user_scores WHERE username = 'sample_arlin'");
      assert.deepEqual(rows[0], { total_points: '115', visit_count: '4' });
    });
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
