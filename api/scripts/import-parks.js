#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../src/db');

const NPS_PARKS_URL = 'https://developer.nps.gov/api/v1/parks';
const PAGE_SIZE = 500;
const MAX_NPS_ATTEMPTS = 3;
const NPS_RETRY_DELAY_MS = 1000;
const NPS_FIELDS = ['images', 'directionsInfo', 'weatherInfo', 'entranceFees'];
const SPECIAL_PARK_CODES = new Set(['redw', 'npsa']);
const EASY_DESIGNATIONS = ['national memorial', 'national historic site'];
const MEDIUM_DESIGNATIONS = [
  'national park',
  'national seashore',
  'national recreation area',
];
const HARD_ACCESS_PATTERN = /\bferry\b|\bseaplane\b|\bbush plane\b|\bfour[- ]wheel drive\b|\b4wd\b|\bno roads\b|\bpermit required\b/i;
const MEDIUM_ACCESS_PATTERN = /seasonal closures|\bsnow\b|\bunpaved\b|high elevation/i;

// Include the guide's designations plus the two park-code exceptions from NPS.
function isParkOrMonument(site) {
  const designation = (site.designation || '').trim().toLowerCase();
  const parkCode = (site.parkCode || '').trim().toLowerCase();
  return SPECIAL_PARK_CODES.has(parkCode)
    || designation.startsWith('national park')
    || designation.startsWith('national monument')
    || designation.startsWith('national memorial')
    || designation.startsWith('national historic site')
    || designation.startsWith('national seashore')
    || designation.startsWith('national recreation area');
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getCoordinates(site) {
  let latitude = parseNumber(site.latitude);
  let longitude = parseNumber(site.longitude);

  if ((latitude === null || longitude === null) && site.latLong) {
    const match = String(site.latLong).match(/lat\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*long\s*:\s*(-?\d+(?:\.\d+)?)/i);
    if (match) {
      latitude ??= parseNumber(match[1]);
      longitude ??= parseNumber(match[2]);
    }
  }

  return { latitude, longitude };
}

function getPointValue(site) {
  const designation = (site.designation || '').trim().toLowerCase();
  if (designation.startsWith('national monument')) return 15;

  const easyByDesignation = EASY_DESIGNATIONS.some((value) => designation.startsWith(value));
  const knownPark = MEDIUM_DESIGNATIONS.some((value) => designation.startsWith(value))
    || SPECIAL_PARK_CODES.has((site.parkCode || '').trim().toLowerCase());
  let tier = easyByDesignation && !knownPark ? 0 : 1; // Easy, Medium, Hard.

  const accessText = `${site.directionsInfo || ''} ${site.weatherInfo || ''}`;
  const hardAccess = HARD_ACCESS_PATTERN.test(accessText);
  const mediumAccess = MEDIUM_ACCESS_PATTERN.test(accessText);
  const states = (site.states || '').split(',').map((state) => state.trim().toUpperCase());
  const remoteRegion = states.some((state) => ['AK', 'HI', 'AS', 'VI'].includes(state));
  const fees = Array.isArray(site.entranceFees) ? site.entranceFees : [];
  const costs = fees.map((fee) => parseNumber(fee.cost)).filter((cost) => cost !== null);
  const allFeesAreFree = costs.length > 0 && costs.every((cost) => cost === 0);
  const standardVehicleFee = costs.some((cost) => cost >= 20 && cost <= 35);

  // A free fee schedule is a weak easy-site signal; access conditions take priority.
  if (allFeesAreFree && !mediumAccess && !hardAccess && !remoteRegion) tier = 0;
  if (mediumAccess) tier = Math.max(tier, 1);
  if (standardVehicleFee) tier = Math.max(tier, 2);

  // Remote states move a site up one tier, capped at Hard.
  if (remoteRegion) tier = Math.min(tier + 1, 2);

  // Difficult-access indicators use the point scheme's 75-point override.
  if (hardAccess) return 75;

  return [20, 25, 50][tier];
}

async function requestNpsPage(url, apiKey) {
  for (let attempt = 1; attempt <= MAX_NPS_ATTEMPTS; attempt += 1) {
    const response = await fetch(url, {
      headers: { 'X-Api-Key': apiKey },
    });

    if (response.status !== 503 || attempt === MAX_NPS_ATTEMPTS) return response;

    console.warn(`NPS API returned 503; retrying in ${NPS_RETRY_DELAY_MS / 1000} seconds (${attempt}/${MAX_NPS_ATTEMPTS - 1}).`);
    await response.body?.cancel();
    await sleep(NPS_RETRY_DELAY_MS);
  }
}

async function fetchParks(apiKey) {
  const allSites = [];
  let start = 0;

  while (true) {
    // NPS uses start as the zero-based offset for each page of results.
    const url = new URL(NPS_PARKS_URL);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('start', String(start));
    url.searchParams.set('fields', NPS_FIELDS.join(','));

    const response = await requestNpsPage(url, apiKey);

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
  const schema = await fs.readFile(path.resolve(__dirname, '../schema.sql'), 'utf8');
  const client = await pool.connect();

  try {
    // Commit the import as a unit so a failed record cannot leave a partial catalogue.
    await client.query('BEGIN');
    await client.query(schema);

    for (const site of sites) {
      if (!site.fullName || !site.parkCode) {
        throw new Error('An NPS record is missing fullName or parkCode');
      }

      const { latitude, longitude } = getCoordinates(site);
      const imageUrl = Array.isArray(site.images)
        ? site.images.find((image) => image && image.url)?.url || null
        : null;

      // Upsert NPS fields while keeping the local database ID stable.
      await client.query(
        `INSERT INTO parks (
           name, description, location, park_code, designation,
           latitude, longitude, image_url, point_value
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (name) DO UPDATE SET
           description = EXCLUDED.description,
           location = EXCLUDED.location,
           park_code = EXCLUDED.park_code,
           designation = EXCLUDED.designation,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           image_url = EXCLUDED.image_url,
           point_value = EXCLUDED.point_value,
           updated_at = CURRENT_TIMESTAMP`,
        [
          site.fullName,
          site.description || '',
          site.states || null,
          site.parkCode,
          site.designation || null,
          latitude,
          longitude,
          imageUrl,
          getPointValue(site),
        ],
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
    console.log(`Imported ${sites.length} NPS parks and monuments.`);
  } finally {
    await pool.end();
  }
}

// Run the import only when this file is started directly, so tests can load the filter.
if (require.main === module) {
  main().catch((error) => {
    console.error(`Park import failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { isParkOrMonument, getCoordinates, getPointValue };
