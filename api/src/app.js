const express = require('express');
const cors = require('cors');
const pool = require('./db');
const parksRouter = require('./routes/parks');
const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');

const app = express();
// Number of proxies in front of the app (Render sits behind its own). Needed for per-visitor rate limits.
const trustProxy = Number(process.env.TRUST_PROXY);
if (Number.isInteger(trustProxy) && trustProxy > 0) app.set('trust proxy', trustProxy);
app.use(cors());
app.use(express.json());
// Mount park catalogue endpoints at /parks.
app.use('/parks', parksRouter);
// Sign up, sign in and the signed-in user.
app.use('/auth', authRouter);
app.use('/me', meRouter);

// Health check: confirms the API is up. Render also uses this path.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'thunderpeak-api' });
});

// Database check: confirms the API can reach PostgreSQL.
app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    console.error('Database health check failed:', err.code || err.message);
    res.status(503).json({ status: 'error', message: 'database unavailable' });
  }
});

module.exports = app;
