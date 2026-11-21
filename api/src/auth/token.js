const jwt = require('jsonwebtoken');

const EXPIRES_IN = '7d';
const MIN_SECRET_LENGTH = 32;

// True when JWT_SECRET is set and long enough. Checked at startup and before every sign or verify.
function isConfigured() {
  const secret = process.env.JWT_SECRET;
  return typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH;
}

function getSecret() {
  if (!isConfigured()) {
    throw new Error(`JWT_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters`);
  }
  return process.env.JWT_SECRET;
}

// The token carries only the user id (sub) and an expiry (exp).
function signToken(userId) {
  return jwt.sign({}, getSecret(), {
    algorithm: 'HS256',
    subject: String(userId),
    expiresIn: EXPIRES_IN,
  });
}

// Returns the user id, or null for a missing, tampered or expired token.
function verifyToken(token) {
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken, isConfigured };
