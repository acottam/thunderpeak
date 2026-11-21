#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to apply the park scoring migration.');
  process.exit(1);
}

const pool = require('../src/db');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, '../migrations/001-park-scoring.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Park scoring migration applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error('Park scoring migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
