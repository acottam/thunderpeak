const express = require('express');
const { hashPassword, verifyPassword } = require('../auth/password');
const { signToken, isConfigured } = require('../auth/token');
const { createUser, findUserByUsername } = require('../queries/users');

const router = express.Router();

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

// Checked once, so a login against an unknown user costs about the same time as a wrong password.
const DUMMY_HASH_PROMISE = hashPassword('not-a-real-password');

function error(res, status, message) {
  return res.status(status).json({ status: 'error', message });
}

// Usernames are stored in lowercase, so "Adam" and "adam" are the same account.
function readCredentials(body) {
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  return { username, password };
}

router.use((req, res, next) => {
  if (!isConfigured()) return error(res, 503, 'Login is not configured');
  return next();
});

router.post('/register', async (req, res) => {
  const { username, password } = readCredentials(req.body);
  if (!USERNAME_PATTERN.test(username)) {
    return error(res, 400, 'Username must be 3 to 30 characters: letters, digits and underscore');
  }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return error(res, 400, `Password must be ${MIN_PASSWORD} to ${MAX_PASSWORD} characters`);
  }

  try {
    const user = await createUser(username, await hashPassword(password));
    return res.status(201).json({ user, token: signToken(user.id) });
  } catch (err) {
    if (err.code === '23505') return error(res, 409, 'That username is taken');
    console.error('Register failed:', err.code || err.message);
    return error(res, 503, 'Sign up unavailable');
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = readCredentials(req.body);
  if (!username || !password) {
    return error(res, 400, 'Username and password are required');
  }

  try {
    const found = await findUserByUsername(username);
    const stored = found ? found.password_hash : await DUMMY_HASH_PROMISE;
    const matches = await verifyPassword(password, stored);
    if (!found || !matches) return error(res, 401, 'Wrong username or password');

    return res.json({ user: { id: found.id, username: found.username }, token: signToken(found.id) });
  } catch (err) {
    console.error('Login failed:', err.code || err.message);
    return error(res, 503, 'Sign in unavailable');
  }
});

module.exports = router;
