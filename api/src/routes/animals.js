const express = require('express');
const { listAnimals } = require('../queries/wildlife');

const router = express.Router();

function toNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('Animal value is not a number');
  return number;
}

// Public list for the Wildlife screen. PostgreSQL returns DECIMAL as a string, so convert it.
async function listAnimalsHandler(req, res) {
  try {
    const animals = await listAnimals();
    return res.json(animals.map((animal) => ({
      ...animal,
      base_points: toNumber(animal.base_points),
      rarity_multiplier: toNumber(animal.rarity_multiplier),
      point_value: toNumber(animal.point_value),
    })));
  } catch (error) {
    console.error('Failed to fetch animals:', error.code || error.message);
    return res.status(503).json({ status: 'error', message: 'Animal list unavailable' });
  }
}

router.get('/', listAnimalsHandler);

module.exports = router;
module.exports.handlers = { listAnimalsHandler };
