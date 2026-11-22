const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { findUserById } = require('../queries/users');

const router = express.Router();

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

module.exports = router;
