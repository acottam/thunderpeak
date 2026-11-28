const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');

test('activity scoring migration', async (t) => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const schema = `activity_test_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    for (const file of ['schema.sql', 'migrations/001-park-scoring.sql', 'seed.sql']) {
      await client.query(await readFile(path.join(root, file), 'utf8'));
    }

    await client.query("INSERT INTO users (username, password_hash) VALUES ('alice', 'disabled'), ('bob', 'disabled'), ('empty', 'disabled')");
    await client.query("INSERT INTO parks (name, point_value) VALUES ('Park A', 50), ('Park B', 15)");
    await client.query(`INSERT INTO visits (user_id, park_id, visited_date) VALUES
      (1, 1, '2024-01-01'), (1, 1, '2024-01-01'), (1, 1, '2024-06-01'),
      (1, 1, '2025-01-01'), (1, 2, '2024-01-01'), (2, 1, '2024-01-01')`);

    const migration = await readFile(path.join(root, 'migrations/002-activity-scoring.sql'), 'utf8');
    await t.test('rejects existing duplicate activities without removing data', async () => {
      await client.query('INSERT INTO visit_activities (visit_id, activity_id) VALUES (1, 2), (1, 2)');
      await client.query('SAVEPOINT duplicate_migration');
      await assert.rejects(client.query(migration), { code: '23505' });
      await client.query('ROLLBACK TO SAVEPOINT duplicate_migration');
      const { rows } = await client.query('SELECT COUNT(*) AS count FROM visit_activities');
      assert.equal(rows[0].count, '2');
      await client.query('DELETE FROM visit_activities');
    });

    await client.query(migration);
    await client.query(migration);
    await client.query(await readFile(path.join(root, 'migrations/001-park-scoring.sql'), 'utf8'));

    await t.test('enforces one hike difficulty and activity per visit', async () => {
      await client.query('INSERT INTO visit_hikes (visit_id, hike_difficulty_id) VALUES (2, 3), (1, 3)');
      await client.query('INSERT INTO visit_activities (visit_id, activity_id) VALUES (2, 2), (1, 2)');
      for (const sql of [
        'INSERT INTO visit_hikes (visit_id, hike_difficulty_id) VALUES (1, 3)',
        'INSERT INTO visit_activities (visit_id, activity_id) VALUES (1, 2)',
      ]) {
        await client.query('SAVEPOINT duplicate_event');
        await assert.rejects(client.query(sql), { code: '23505' });
        await client.query('ROLLBACK TO SAVEPOINT duplicate_event');
      }
    });

    await t.test('same-day events score once per user, park and event type', async () => {
      await client.query(`INSERT INTO visit_hikes (visit_id, hike_difficulty_id) VALUES
        (2, 1), (5, 3), (6, 3)`);
      await client.query(`INSERT INTO visit_activities (visit_id, activity_id) VALUES
        (2, 1), (5, 2), (6, 2)`);
      const hikes = await client.query('SELECT visit_id, hike_difficulty_id, points_awarded FROM scored_hikes ORDER BY visit_id, hike_difficulty_id');
      assert.deepEqual(hikes.rows.map((r) => [r.visit_id, r.hike_difficulty_id, r.points_awarded]), [
        [1, 3, 20], [2, 1, 5], [2, 3, 0], [5, 3, 20], [6, 3, 20],
      ]);
      const activities = await client.query('SELECT visit_id, activity_id, points_awarded FROM scored_activities ORDER BY visit_id, activity_id');
      assert.deepEqual(activities.rows.map((r) => [r.visit_id, r.activity_id, r.points_awarded]), [
        [1, 2, 8], [2, 1, 3], [2, 2, 0], [5, 2, 8], [6, 2, 8],
      ]);
    });

    await t.test('wildlife uses a rolling year, park and species with rounded points', async () => {
      await client.query(`INSERT INTO visit_animal_sightings (visit_id, animal_id) VALUES
        (1, 2), (3, 2), (4, 2), (5, 2), (6, 2), (1, 9)`);
      const { rows } = await client.query(`
        SELECT visit_id, animal_id, earns_points, points_awarded
        FROM scored_sightings ORDER BY visit_id, animal_id
      `);
      assert.deepEqual(rows.map((r) => [r.visit_id, r.animal_id, r.earns_points, r.points_awarded]), [
        [1, 2, true, 35], [1, 9, true, 11], [3, 2, false, 0],
        [4, 2, true, 35], [5, 2, true, 35], [6, 2, true, 35],
      ]);
    });

    await t.test('backdated sightings recalculate later awards', async () => {
      const visit = await client.query("INSERT INTO visits (user_id, park_id, visited_date) VALUES (1, 1, '2023-06-01') RETURNING id");
      await client.query('INSERT INTO visit_animal_sightings (visit_id, animal_id) VALUES ($1, 2)', [visit.rows[0].id]);
      const { rows } = await client.query(`
        SELECT visited_date::text, earns_points FROM scored_sightings
        WHERE user_id = 1 AND park_id = 1 AND animal_id = 2 ORDER BY visited_date, id
      `);
      assert.deepEqual(rows.map((r) => [r.visited_date, r.earns_points]), [
        ['2023-06-01', true], ['2024-01-01', false], ['2024-06-01', true], ['2025-01-01', false],
      ]);
    });

    await t.test('totals independently and keeps the existing view columns and zero users', async () => {
      const { rows } = await client.query(`
        SELECT username, visit_count, total_points, park_points, hike_points, activity_points, wildlife_points
        FROM user_scores ORDER BY user_id
      `);
      assert.deepEqual(rows, [
        { username: 'alice', visit_count: '6', total_points: '295', park_points: '115', hike_points: '45', activity_points: '19', wildlife_points: '116' },
        { username: 'bob', visit_count: '1', total_points: '113', park_points: '50', hike_points: '20', activity_points: '8', wildlife_points: '35' },
        { username: 'empty', visit_count: '0', total_points: '0', park_points: '0', hike_points: '0', activity_points: '0', wildlife_points: '0' },
      ]);
    });

    await t.test('activities can earn points when the park check-in scores zero', async () => {
      await client.query('INSERT INTO visit_hikes (visit_id, hike_difficulty_id) VALUES (4, 3)');
      await client.query('INSERT INTO visit_activities (visit_id, activity_id) VALUES (4, 2)');
      const { rows } = await client.query(`
        SELECT v.points_awarded AS park, h.points_awarded AS hike, a.points_awarded AS activity
        FROM scored_visits v
        JOIN scored_hikes h ON h.visit_id = v.id
        JOIN scored_activities a ON a.visit_id = v.id
        WHERE v.id = 4
      `);
      assert.deepEqual(rows[0], { park: 0, hike: 20, activity: 8 });
    });

    await t.test('uses leap-day anniversaries and updated point values', async () => {
      const visits = await client.query(`INSERT INTO visits (user_id, park_id, visited_date) VALUES
        (2, 2, '2024-02-29'), (2, 2, '2025-02-27'), (2, 2, '2025-02-28') RETURNING id`);
      for (const visit of visits.rows) {
        await client.query('INSERT INTO visit_animal_sightings (visit_id, animal_id) VALUES ($1, 2)', [visit.id]);
      }
      await client.query('UPDATE animals SET base_points = 12 WHERE id = 2');
      const { rows } = await client.query(`
        SELECT visited_date::text, points_awarded FROM scored_sightings
        WHERE user_id = 2 AND park_id = 2 AND animal_id = 2 ORDER BY visited_date
      `);
      assert.deepEqual(rows.map((r) => [r.visited_date, r.points_awarded]), [
        ['2024-02-29', 42], ['2025-02-27', 0], ['2025-02-28', 42],
      ]);
    });
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
