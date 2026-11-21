const express = require('express');
const { getParks, getParkById } = require('../queries/parks');

const router = express.Router();

// List the park catalogue; database access stays in the query module.
router.get('/', async (req, res) => {
  try {
    const parks = await getParks();
    return res.json(parks);
  } catch (error) {
    console.error('Failed to fetch parks:', error.code || error.message);
    return res.status(503).json({ status: 'error', message: 'Park catalogue unavailable' });
  }
});

// Fetch one park by its local database ID.
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ status: 'error', message: 'Park id must be a positive integer' });
  }

  try {
    const park = await getParkById(id);
    if (!park) {
      return res.status(404).json({ status: 'error', message: 'Park not found' });
    }
    return res.json(park);
  } catch (error) {
    console.error('Failed to fetch park:', error.code || error.message);
    return res.status(503).json({ status: 'error', message: 'Park catalogue unavailable' });
  }
});

module.exports = router;
