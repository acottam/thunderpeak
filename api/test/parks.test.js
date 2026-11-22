const assert = require('node:assert/strict');
const { test } = require('node:test');

// Replace database calls so route tests run without PostgreSQL.
const parkQueries = require('../src/queries/parks');
const mockQueries = {
  getParks: async () => [],
  getParkById: async () => null,
};
parkQueries.getParks = (...args) => mockQueries.getParks(...args);
parkQueries.getParkById = (...args) => mockQueries.getParkById(...args);

const parksRouter = require('../src/routes/parks');
const { listParks, getPark } = parksRouter.handlers;

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('GET /parks routes', async (t) => {
  const park = {
    id: 12,
    name: 'Redwood National Park',
    description: 'Old-growth coastal redwoods',
    location: 'CA',
  };

  await t.test('registers GET /parks and GET /parks/:id', () => {
    const getRoutes = parksRouter.stack
      .filter((layer) => layer.route && layer.route.methods.get)
      .map((layer) => layer.route.path);
    assert.deepEqual(getRoutes, ['/', '/:id']);
  });

  await t.test('GET /parks returns the catalogue', async () => {
    mockQueries.getParks = async () => [park];
    const res = createResponse();

    await listParks({}, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, [park]);
  });

  await t.test('GET /parks/:id returns the matching park', async () => {
    let requestedId;
    mockQueries.getParkById = async (id) => {
      requestedId = id;
      return park;
    };
    const res = createResponse();

    await getPark({ params: { id: '12' } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, park);
    assert.equal(requestedId, 12);
  });

  await t.test('GET /parks/:id rejects invalid IDs without querying the database', async () => {
    let queryCalled = false;
    mockQueries.getParkById = async () => {
      queryCalled = true;
      return park;
    };
    const res = createResponse();

    await getPark({ params: { id: 'not-an-id' } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(queryCalled, false);
  });

  await t.test('GET /parks/:id returns 404 when no park matches', async () => {
    mockQueries.getParkById = async () => null;
    const res = createResponse();

    await getPark({ params: { id: '999' } }, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { status: 'error', message: 'Park not found' });
  });

  await t.test('GET /parks returns 503 when its database query fails', async (t) => {
    t.mock.method(console, 'error', () => {});
    mockQueries.getParks = async () => {
      throw new Error('database unavailable');
    };
    const res = createResponse();

    await listParks({}, res);

    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { status: 'error', message: 'Park catalogue unavailable' });
  });

  await t.test('GET /parks/:id returns 503 when its database query fails', async (t) => {
    t.mock.method(console, 'error', () => {});
    mockQueries.getParkById = async () => {
      throw new Error('database unavailable');
    };
    const res = createResponse();

    await getPark({ params: { id: '12' } }, res);

    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { status: 'error', message: 'Park catalogue unavailable' });
  });
});
