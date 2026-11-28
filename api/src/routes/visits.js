const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createVisit, createVisitHike, createVisitActivity, getVisitDetails,
} = require('../queries/visits');

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

function toJsonNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('Visit points are not a finite number');
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

async function createVisitHikeHandler(req, res) {
  const visitId = positiveInteger(req.params.id);
  if (!visitId) return error(res, 400, 'visit id must be a positive integer');
  const difficultyId = positiveInteger(req.body?.hike_difficulty_id);
  if (!difficultyId) return error(res, 400, 'hike_difficulty_id must be a positive integer');
  try {
    const hike = await createVisitHike(req.userId, visitId, difficultyId);
    if (hike.notFound) return error(res, 404, 'Visit not found');
    if (hike.invalidDifficulty) return error(res, 400, 'hike_difficulty_id is not valid');
    if (hike.duplicate) return error(res, 409, 'This hike difficulty is already recorded for the visit');
    return res.status(201).json(hike);
  } catch (err) {
    console.error('Failed to record hike:', err.code || err.message);
    return error(res, 503, 'Hike unavailable');
  }
}

async function createVisitActivityHandler(req, res) {
  const visitId = positiveInteger(req.params.id);
  if (!visitId) return error(res, 400, 'visit id must be a positive integer');
  const activityId = positiveInteger(req.body?.activity_id);
  if (!activityId) return error(res, 400, 'activity_id must be a positive integer');
  try {
    const activity = await createVisitActivity(req.userId, visitId, activityId);
    if (activity.notFound) return error(res, 404, 'Visit not found');
    if (activity.invalidActivity) return error(res, 400, 'activity_id is not valid');
    if (activity.unavailable) return error(res, 400, 'Activity is not available at this park');
    if (activity.duplicate) return error(res, 409, 'This activity is already recorded for the visit');
    return res.status(201).json(activity);
  } catch (err) {
    console.error('Failed to record activity:', err.code || err.message);
    return error(res, 503, 'Activity unavailable');
  }
}

async function getVisitHandler(req, res) {
  const visitId = positiveInteger(req.params.id);
  if (!visitId) return error(res, 400, 'visit id must be a positive integer');
  try {
    const visit = await getVisitDetails(req.userId, visitId);
    if (!visit) return error(res, 404, 'Visit not found');
    return res.json({
      ...visit,
      visit_points: toJsonNumber(visit.visit_points),
      activity_points: toJsonNumber(visit.activity_points),
      total_points: toJsonNumber(visit.total_points),
    });
  } catch (err) {
    console.error('Failed to fetch visit:', err.code || err.message);
    return error(res, 503, 'Visit unavailable');
  }
}

router.post('/', requireAuth, createVisitHandler);
router.get('/:id', requireAuth, getVisitHandler);
router.post('/:id/hikes', requireAuth, createVisitHikeHandler);
router.post('/:id/activities', requireAuth, createVisitActivityHandler);

module.exports = router;
module.exports.handlers = {
  createVisitHandler, createVisitHikeHandler, createVisitActivityHandler, getVisitHandler,
};
