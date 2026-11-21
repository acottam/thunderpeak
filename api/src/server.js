require('dotenv').config();
const app = require('./app');
const { isConfigured } = require('./auth/token');

const port = process.env.PORT || 3000;

if (!isConfigured()) {
  console.warn('JWT_SECRET is missing or shorter than 32 characters. /auth and /me will answer 503 until it is set.');
}

app.listen(port, () => {
  console.log(`Thunderpeak API listening on port ${port}`);
});
