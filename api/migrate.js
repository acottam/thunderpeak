#!/usr/bin/env node
/**
 * Database Migration Runner
 * Pushes schema and seed data to PostgreSQL (local or Render)
 * 
 * Usage:
 *   node api/migrate.js
 * 
 * This script reads schema.sql and seed.sql, then executes them
 * against the database specified in DATABASE_URL (.env file)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  try {
    console.log('Starting database migration...');
    console.log(`Target database: ${process.env.DATABASE_URL.split('@')[1] || 'local'}`);

    // Read schema and seed files
    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedPath = path.join(__dirname, 'seed.sql');

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found: ${seedPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    const seed = fs.readFileSync(seedPath, 'utf-8');

    // Execute schema
    console.log('\nRunning schema migration...');
    await pool.query(schema);
    console.log('Schema created successfully');

    // Execute seed data
    console.log('\nSeeding reference data...');
    await pool.query(seed);
    console.log('Seed data loaded successfully');

    // Verify tables
    console.log('\nVerifying tables...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`Created ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\nMigration complete');
  } catch (error) {
    console.error('\nMigration failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
