process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters-long';

jest.mock('../src/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../src/db');
const app = require('../src/app');
const { hashPassword, verifyPassword } = require('../src/auth/password');
const { signToken, verifyToken } = require('../src/auth/token');

describe('password hashing', () => {
  test('hashes with a random salt and verifies the right password only', async () => {
    const a = await hashPassword('correct horse battery');
    const b = await hashPassword('correct horse battery');
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt$')).toBe(true);
    expect(a.length).toBeLessThan(255);
    expect(await verifyPassword('correct horse battery', a)).toBe(true);
    expect(await verifyPassword('wrong password', a)).toBe(false);
  });

  test('a malformed stored value returns false, not an error', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', null)).toBe(false);
  });
});

describe('tokens', () => {
  test('round trip returns the user id', () => {
    expect(verifyToken(signToken(42))).toBe(42);
  });

  test('tampered, expired and wrong-secret tokens are rejected', () => {
    const good = signToken(7);
    expect(verifyToken(`${good}x`)).toBeNull();
    expect(verifyToken('garbage')).toBeNull();
    const expired = jwt.sign({}, process.env.JWT_SECRET, { subject: '7', expiresIn: -10 });
    expect(verifyToken(expired)).toBeNull();
    const other = jwt.sign({}, 'a-different-secret-that-is-long-enough-123456', { subject: '7' });
    expect(verifyToken(other)).toBeNull();
  });

  test('an unsigned (alg none) token is rejected', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: '7' })).toString('base64url');
    expect(verifyToken(`${header}.${body}.`)).toBeNull();
  });
});

afterEach(() => jest.restoreAllMocks());

describe('POST /auth/register', () => {
  test('creates a user, lowercases the username and returns a token', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 5, username: 'adam_c' }] });
    const res = await request(app).post('/auth/register').send({ username: ' Adam_C ', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: 5, username: 'adam_c' });
    expect(verifyToken(res.body.token)).toBe(5);
    expect(res.body.user.password_hash).toBeUndefined();
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO users/);
    expect(params[0]).toBe('adam_c');
    expect(params[1]).not.toContain('password123');
  });

  test.each([
    [{ username: 'ab', password: 'password123' }],
    [{ username: 'has space', password: 'password123' }],
    [{ username: 'adam', password: 'short' }],
    [{ username: 'adam', password: 'x'.repeat(129) }],
    [{ username: 'adam' }],
    [{}],
  ])('rejects invalid input %j with 400 and does not touch the database', async (body) => {
    const res = await request(app).post('/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('returns 409 when the username is taken', async () => {
    pool.query.mockRejectedValue(Object.assign(new Error('duplicate'), { code: '23505' }));
    const res = await request(app).post('/auth/register').send({ username: 'adam', password: 'password123' });
    expect(res.status).toBe(409);
  });

  test('returns 503 when the database fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockRejectedValue(Object.assign(new Error('down'), { code: 'ECONNREFUSED' }));
    const res = await request(app).post('/auth/register').send({ username: 'adam', password: 'password123' });
    expect(res.status).toBe(503);
  });
});

describe('POST /auth/login', () => {
  test('returns the user and a token for the right password', async () => {
    const hash = await hashPassword('password123');
    pool.query.mockResolvedValue({ rows: [{ id: 9, username: 'adam', password_hash: hash }] });
    const res = await request(app).post('/auth/login').send({ username: 'ADAM', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 9, username: 'adam' });
    expect(verifyToken(res.body.token)).toBe(9);
    expect(JSON.stringify(res.body)).not.toMatch(/scrypt/);
  });

  test('wrong password and unknown user both return the same 401', async () => {
    const hash = await hashPassword('password123');
    pool.query.mockResolvedValueOnce({ rows: [{ id: 9, username: 'adam', password_hash: hash }] });
    const wrong = await request(app).post('/auth/login').send({ username: 'adam', password: 'nope-nope-nope' });
    pool.query.mockResolvedValueOnce({ rows: [] });
    const unknown = await request(app).post('/auth/login').send({ username: 'ghost', password: 'password123' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  test('missing fields return 400', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'adam' });
    expect(res.status).toBe(400);
  });
});

describe('GET /me', () => {
  test('returns the signed-in user', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 3, username: 'arlin' }] });
    const res = await request(app).get('/me').set('Authorization', `Bearer ${signToken(3)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 3, username: 'arlin' });
  });

  test.each([
    ['no header', undefined],
    ['wrong scheme', 'Basic abc'],
    ['bad token', 'Bearer not.a.token'],
  ])('returns 401 for %s', async (_name, header) => {
    const req = request(app).get('/me');
    if (header) req.set('Authorization', header);
    const res = await req;
    expect(res.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('returns 401 when the account no longer exists', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/me').set('Authorization', `Bearer ${signToken(77)}`);
    expect(res.status).toBe(401);
  });
});

describe('when JWT_SECRET is not configured', () => {
  const original = process.env.JWT_SECRET;
  afterEach(() => { process.env.JWT_SECRET = original; });

  test('auth routes answer 503 and the park routes still work', async () => {
    delete process.env.JWT_SECRET;
    expect((await request(app).post('/auth/login').send({ username: 'a', password: 'b' })).status).toBe(503);
    expect((await request(app).get('/me')).status).toBe(503);
    pool.query.mockResolvedValue({ rows: [] });
    expect((await request(app).get('/parks')).status).toBe(200);
  });
});
