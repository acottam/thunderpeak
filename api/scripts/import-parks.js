#!/usr/bin/env node

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../src/db');

const NPS_PARKS_URL = 'https://developer.nps.gov/api/v1/parks';
const PAGE_SIZE = 500;

// Keep only the two NPS designations used by the Thunderpeak catalogue.
function isParkOrMonument(site) {
  const designation = (site.designation || '').trim().toLowerCase();
  return designation.startsWith('national park') || designation.startsWith('national monument');
}

async function fetchParks(apiKey) {
  const allSites = [];
  let start = 0;

  while (true) {
    // NPS uses start as the zero-based offset for each page of results.
    const url = new URL(NPS_PARKS_URL);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('start', String(start));

    const response = await fetch(url, {
      headers: { 'X-Api-Key': apiKey },
    });

    if (!response.ok) {
      throw new Error(`NPS API request failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload.data)) {
      throw new Error('NPS API response did not contain a data array');
    }

    allSites.push(...payload.data);
    const total = Number(payload.total);
    if (payload.data.length < PAGE_SIZE || (Number.isFinite(total) && allSites.length >= total)) {
      break;
    }
    start += payload.data.length;
  }

  return allSites.filter(isParkOrMonument);
}

async function upsertParks(sites) {
  const client = await pool.connect();

  try {
    // Commit the import as a unit so a failed record cannot leave a partial catalogue.
    await client.query('BEGIN');

    for (const site of sites) {
      if (!site.fullName) {
        throw new Error('An NPS record is missing fullName');
      }

      // Map NPS fields into the existing parks table without adding columns.
      await client.query(
        `INSERT INTO parks (name, description, location)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET
           description = EXCLUDED.description,
           location = EXCLUDED.location,
           updated_at = CURRENT_TIMESTAMP`,
        [site.fullName, site.description || '', site.states || null],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const { NPS_API_KEY, DATABASE_URL } = process.env;
  if (!NPS_API_KEY) throw new Error('NPS_API_KEY is missing; add it to api/.env');
  if (!DATABASE_URL) throw new Error('DATABASE_URL is missing; add it to api/.env');

  try {
    const sites = await fetchParks(NPS_API_KEY);
    await upsertParks(sites);
    console.log(`Imported ${sites.length} National Parks and National Monuments.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Park import failed: ${error.message}`);
  process.exitCode = 1;
});
