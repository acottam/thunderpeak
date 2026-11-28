const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createVisit } = require('../queries/visits');
const { createSighting } = require('../queries/wildlife');

const router = express.Router();
const INVALID_VISIT_DATE = 'visited_date must be a date in the form YYYY-MM-DD and not in the future';

function error(res, status, message) {
  return res.status(status).json({ status: 'error', message });
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function toJsonInteger(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Scored visit value is outside the safe integer range');
  return number;
}

// Record a check-in and let scored_visits determine whether it earns points.
async function createVisitHandler(req, res) {
  const parkId = positiveInteger(req.body?.park_id);
  if (!parkId) return error(res, 400, 'park_id must be a positive integer');

  const visitedDate = req.body?.visited_date;
  if (visitedDate !== undefined && !validDate(visitedDate)) {
    return error(res, 400, INVALID_VISIT_DATE);
  }

  try {
    const visit = await createVisit(req.userId, parkId, visitedDate || null);
    if (visit.notFound) return error(res, 404, 'Park not found');
    if (visit.invalidDate) return error(res, 400, INVALID_VISIT_DATE);

    return res.status(201).json({
      ...visit,
      points_awarded: toJsonInteger(visit.points_awarded),
    });
  } catch (err) {
    console.error('Failed to create visit:', err.code || err.message);
    return error(res, 503, 'Visit unavailable');
  }
}

// Log a wildlife sighting on one of the signed-in user's visits (docs/api.md, Logging against a visit).
async function createSightingHandler(req, res) {
  const visitId = positiveInteger(req.params.id);
  if (!visitId) return error(res, 400, 'Visit id must be a positive integer');

  const animalId = positiveInteger(req.body?.animal_id);
  if (!animalId) return error(res, 400, 'animal_id must be a positive integer');

  try {
    const sighting = await createSighting(req.userId, visitId, animalId);
    if (sighting.visitNotFound) return error(res, 404, 'Visit not found');
    if (sighting.animalNotFound) return error(res, 404, 'Animal not found');
    if (sighting.duplicate) return error(res, 409, 'That animal is already logged for this visit');

    return res.status(201).json({
      ...sighting,
      points_awarded: toJsonInteger(sighting.points_awarded),
    });
  } catch (err) {
    console.error('Failed to log sighting:', err.code || err.message);
    return error(res, 503, 'Sightings unavailable');
  }
}

router.post('/', requireAuth, createVisitHandler);
router.post('/:id/sightings', requireAuth, createSightingHandler);

module.exports = router;
module.exports.handlers = { createVisitHandler, createSightingHandler };
