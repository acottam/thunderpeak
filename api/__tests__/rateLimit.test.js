jest.mock('../src/db', () => ({ query: jest.fn() }));

const request = require('supertest');

// The secret is read on every request, so it stays set for the whole file.
process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';

// Limits and proxy settings are read when the modules load, so each test builds a fresh app
// (with a fresh, empty limiter) under its own settings, then puts the environment back.
function loadApp(extraEnv = {}) {
  const settings = { LOGIN_RATE_LIMIT_MAX: '3', REGISTER_RATE_LIMIT_MAX: '2', RENDER: '', TRUST_PROXY: '', CLIENT_IP_HEADER: '', ...extraEnv };
  const saved = {};
  Object.keys(settings).forEach((key) => { saved[key] = process.env[key]; });
  Object.assign(process.env, settings);
  let app;
  let pool;
  jest.isolateModules(() => {
    pool = require('../src/db');
    app = require('../src/app');
  });
  Object.entries(saved).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  });
  return { app, pool };
}

const bad = { username: 'adam', password: 'wrong-password' };

afterEach(() => jest.restoreAllMocks());

describe('login rate limit', () => {
  test('the attempt after the limit of failed sign-ins gets 429 in the usual error shape', async () => {
    const { app, pool } = loadApp();
    pool.query.mockResolvedValue({ rows: [] });
    for (let i = 0; i < 3; i += 1) {
      expect((await request(app).post('/auth/login').send(bad)).status).toBe(401);
    }
    const res = await request(app).post('/auth/login').send(bad);
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ status: 'error', message: 'Too many sign-in attempts. Try again later.' });
    expect(res.headers.ratelimit).toBeDefined();
  });

  test('successful sign-ins do not count against the limit', async () => {
    const { hashPassword } = require('../src/auth/password');
    const { app, pool } = loadApp();
    const hash = await hashPassword('password123');
    pool.query.mockResolvedValue({ rows: [{ id: 1, username: 'adam', password_hash: hash }] });
    for (let i = 0; i < 6; i += 1) {
      const res = await request(app).post('/auth/login').send({ username: 'adam', password: 'password123' });
      expect(res.status).toBe(200);
    }
  });
});

describe('register rate limit', () => {
  test('every sign-up attempt counts, and the one after the limit gets 429', async () => {
    const { app, pool } = loadApp();
    pool.query.mockResolvedValue({ rows: [{ id: 1, username: 'adam' }] });
    const body = { username: 'adam', password: 'password123' };
    expect((await request(app).post('/auth/register').send(body)).status).toBe(201);
    expect((await request(app).post('/auth/register').send(body)).status).toBe(201);
    const res = await request(app).post('/auth/register').send(body);
    expect(res.status).toBe(429);
    expect(res.body.message).toBe('Too many sign-up attempts. Try again later.');
  });
});

describe('scope and safety', () => {
  test('park and health routes are never limited', async () => {
    const { app, pool } = loadApp();
    pool.query.mockResolvedValue({ rows: [] });
    for (let i = 0; i < 8; i += 1) {
      expect((await request(app).get('/parks')).status).toBe(200);
      expect((await request(app).get('/health')).status).toBe(200);
    }
  });

  test('on Render without TRUST_PROXY the limiter stays off, so one shared proxy IP cannot lock everyone out', async () => {
    const { app, pool } = loadApp({ RENDER: 'true' });
    pool.query.mockResolvedValue({ rows: [] });
    for (let i = 0; i < 8; i += 1) {
      expect((await request(app).post('/auth/login').send(bad)).status).toBe(401);
    }
  });

  test('on Render with TRUST_PROXY set the limiter is on and keys on the forwarded client IP', async () => {
    const { app, pool } = loadApp({ RENDER: 'true', TRUST_PROXY: '1' });
    pool.query.mockResolvedValue({ rows: [] });
    const from = (ip) => request(app).post('/auth/login').set('X-Forwarded-For', ip).send(bad);
    for (let i = 0; i < 3; i += 1) await from('203.0.113.7');
    expect((await from('203.0.113.7')).status).toBe(429);
    expect((await from('203.0.113.8')).status).toBe(401); // a different visitor is not affected
  });

  test('a spoofed leftmost X-Forwarded-For value does not reset the limit', async () => {
    const { app, pool } = loadApp({ RENDER: 'true', TRUST_PROXY: '1' });
    pool.query.mockResolvedValue({ rows: [] });
    // With one trusted proxy the proxy appends the real IP, so the key is the rightmost entry.
    const from = (spoof) => request(app).post('/auth/login').set('X-Forwarded-For', `${spoof}, 203.0.113.7`).send(bad);
    for (let i = 0; i < 3; i += 1) await from(`198.51.100.${i}`);
    expect((await from('198.51.100.99')).status).toBe(429);
  });

  test('with CLIENT_IP_HEADER set, visitors behind the same proxy edge get separate limits', async () => {
    const { app, pool } = loadApp({ RENDER: 'true', TRUST_PROXY: '1', CLIENT_IP_HEADER: 'CF-Connecting-IP' });
    pool.query.mockResolvedValue({ rows: [] });
    // Both visitors arrive from the same Cloudflare edge address.
    const from = (ip) => request(app).post('/auth/login')
      .set('X-Forwarded-For', '172.70.1.1').set('CF-Connecting-IP', ip).send(bad);
    for (let i = 0; i < 3; i += 1) await from('203.0.113.7');
    expect((await from('203.0.113.7')).status).toBe(429);
    expect((await from('203.0.113.8')).status).toBe(401);
  });

  test('IPv6 visitors are grouped by /56, so rotating addresses in one range does not reset the limit', async () => {
    const { app, pool } = loadApp({ RENDER: 'true', TRUST_PROXY: '1', CLIENT_IP_HEADER: 'cf-connecting-ip' });
    pool.query.mockResolvedValue({ rows: [] });
    const from = (ip) => request(app).post('/auth/login').set('CF-Connecting-IP', ip).send(bad);
    for (let i = 0; i < 3; i += 1) await from(`2001:db8:abcd:120${i}::1`);
    expect((await from('2001:db8:abcd:12ff::1')).status).toBe(429);
    expect((await from('2001:db8:abcd:1300::1')).status).toBe(401); // a different /56
  });

  test('without CLIENT_IP_HEADER the header is ignored, so it cannot be used to dodge the limit', async () => {
    const { app, pool } = loadApp({ RENDER: 'true', TRUST_PROXY: '1' });
    pool.query.mockResolvedValue({ rows: [] });
    const from = (spoof) => request(app).post('/auth/login')
      .set('X-Forwarded-For', '203.0.113.7').set('CF-Connecting-IP', spoof).send(bad);
    for (let i = 0; i < 3; i += 1) await from(`198.51.100.${i}`);
    expect((await from('198.51.100.99')).status).toBe(429);
  });

  test('a missing or invalid client IP header falls back to the proxy address', async () => {
    const { app, pool } = loadApp({ RENDER: 'true', TRUST_PROXY: '1', CLIENT_IP_HEADER: 'cf-connecting-ip' });
    pool.query.mockResolvedValue({ rows: [] });
    const from = (value) => {
      const req = request(app).post('/auth/login').set('X-Forwarded-For', '203.0.113.7');
      return (value === undefined ? req : req.set('CF-Connecting-IP', value)).send(bad);
    };
    await from(undefined);
    await from('not-an-ip');
    await from('');
    expect((await from('999.1.1.1')).status).toBe(429);
  });
});
