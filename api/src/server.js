require('dotenv').config();
const app = require('./app');
const { isConfigured } = require('./auth/token');
const { enabled: rateLimitEnabled } = require('./middleware/rateLimit');

const port = process.env.PORT || 3000;

if (!isConfigured()) {
  console.warn('JWT_SECRET is missing or shorter than 32 characters. /auth and /me will answer 503 until it is set.');
}

if (!rateLimitEnabled) {
  console.warn('Running on Render without TRUST_PROXY: login rate limiting is OFF. Set TRUST_PROXY to the number of proxies in front of the app.');
}

app.listen(port, () => {
  console.log(`Thunderpeak API listening on port ${port}`);
});
