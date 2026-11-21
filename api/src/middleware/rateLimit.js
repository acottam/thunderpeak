const { rateLimit } = require('express-rate-limit');

function positiveInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

// On Render every request arrives through the platform's proxy. Until TRUST_PROXY says how many
// proxies sit in front of the app, every visitor looks like the same IP. A limiter keyed on that
// IP would let anyone lock all users out, so on Render it stays off until TRUST_PROXY is set.
const behindUnconfiguredProxy = Boolean(process.env.RENDER) && !positiveInt('TRUST_PROXY', 0);
const enabled = !behindUnconfiguredProxy;

function passThrough(req, res, next) {
  return next();
}

function createLimiter({ limit, windowMs, skipSuccessfulRequests, message }) {
  if (!enabled) return passThrough;
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ status: 'error', message }),
  });
}

// Failed sign-ins only: a correct password never counts against the user.
const loginLimiter = createLimiter({
  limit: positiveInt('LOGIN_RATE_LIMIT_MAX', 10),
  windowMs: positiveInt('LOGIN_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Try again later.',
});

// Every sign-up attempt counts, which slows down mass account creation.
const registerLimiter = createLimiter({
  limit: positiveInt('REGISTER_RATE_LIMIT_MAX', 10),
  windowMs: positiveInt('REGISTER_RATE_LIMIT_WINDOW_MS', 60 * 60 * 1000),
  skipSuccessfulRequests: false,
  message: 'Too many sign-up attempts. Try again later.',
});

module.exports = { loginLimiter, registerLimiter, enabled, positiveInt };
