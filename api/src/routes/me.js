const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { findUserById } = require('../queries/users');
const {
  getUserVisits,
  getUserParkStatus,
  getUserScore,
  parkExists,
} = require('../queries/visits');

const router = express.Router();

function error(res, status, message) {
  return res.status(status).json({ status: 'error', message });
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function toJsonInteger(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Score value is outside the safe integer range');
  return number;
}

// The signed-in user. Also confirms the account still exists.
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(401).json({ status: 'error', message: 'Sign in required' });
    return res.json(user);
  } catch (err) {
    console.error('Failed to load user:', err.code || err.message);
    return res.status(503).json({ status: 'error', message: 'Account unavailable' });
  }
});

// Return the signed-in user's visits, optionally filtered to one park.
async function listUserVisits(req, res) {
  let parkId = null;
  if (req.query.park_id !== undefined) {
    parkId = positiveInteger(req.query.park_id);
    if (!parkId) return error(res, 400, 'park_id must be a positive integer');
  }

  try {
    const visits = await getUserVisits(req.userId, parkId);
    return res.json(visits.map((visit) => ({
      ...visit,
      points_awarded: toJsonInteger(visit.points_awarded),
    })));
  } catch (err) {
    console.error('Failed to fetch visits:', err.code || err.message);
    return error(res, 503, 'Visits unavailable');
  }
}

// Summarize visit history and reward eligibility for a park.
async function getUserPark(req, res) {
  const parkId = positiveInteger(req.params.park_id);
  if (!parkId) return error(res, 400, 'Park id must be a positive integer');

  try {
    if (!(await parkExists(parkId))) return error(res, 404, 'Park not found');
    const status = await getUserParkStatus(req.userId, parkId);
    return res.json({
      park_id: parkId,
      visit_count: toJsonInteger(status.visit_count),
      last_visited_date: status.last_visited_date,
      last_awarded_date: status.last_awarded_date,
      next_eligible_date: status.next_eligible_date,
      can_earn_points_now: status.can_earn_points_now,
    });
  } catch (err) {
    console.error('Failed to fetch park visit status:', err.code || err.message);
    return error(res, 503, 'Visit status unavailable');
  }
}

// Return point and visit totals computed by user_scores.
async function getUserScoreHandler(req, res) {
  try {
    const score = await getUserScore(req.userId);
    return res.json({
      total_points: toJsonInteger(score.total_points),
      visit_count: toJsonInteger(score.visit_count),
    });
  } catch (err) {
    console.error('Failed to fetch score:', err.code || err.message);
    return error(res, 503, 'Score unavailable');
  }
}

router.get('/visits', requireAuth, listUserVisits);
router.get('/parks/:park_id', requireAuth, getUserPark);
router.get('/score', requireAuth, getUserScoreHandler);

module.exports = router;
module.exports.handlers = { listUserVisits, getUserPark, getUserScoreHandler };
