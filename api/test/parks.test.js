jest.mock('../src/queries/parks', () => ({
  getParks: jest.fn(),
  getParkById: jest.fn(),
}));

const parkQueries = require('../src/queries/parks');
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

describe('GET /parks routes', () => {
  const park = {
    id: 12,
    name: 'Redwood National Park',
    description: 'Old-growth coastal redwoods',
    location: 'CA',
  };

  beforeEach(() => jest.clearAllMocks());

  test('registers GET /parks and GET /parks/:id', () => {
    const getRoutes = parksRouter.stack
      .filter((layer) => layer.route && layer.route.methods.get)
      .map((layer) => layer.route.path);
    expect(getRoutes).toEqual(['/', '/:id']);
  });

  test('GET /parks returns the catalogue', async () => {
    parkQueries.getParks.mockResolvedValue([park]);
    const res = createResponse();

    await listParks({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([park]);
  });

  test('GET /parks/:id returns the matching park', async () => {
    parkQueries.getParkById.mockResolvedValue(park);
    const res = createResponse();

    await getPark({ params: { id: '12' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(park);
    expect(parkQueries.getParkById).toHaveBeenCalledWith(12);
  });

  test('GET /parks/:id rejects invalid IDs without querying the database', async () => {
    const res = createResponse();

    await getPark({ params: { id: 'not-an-id' } }, res);

    expect(res.statusCode).toBe(400);
    expect(parkQueries.getParkById).not.toHaveBeenCalled();
  });

  test('GET /parks/:id returns 404 when no park matches', async () => {
    parkQueries.getParkById.mockResolvedValue(null);
    const res = createResponse();

    await getPark({ params: { id: '999' } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ status: 'error', message: 'Park not found' });
  });

  test('database errors return 503', async () => {
    const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
    parkQueries.getParks.mockRejectedValue(new Error('database unavailable'));
    const res = createResponse();

    await listParks({}, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ status: 'error', message: 'Park catalogue unavailable' });
    logError.mockRestore();
  });
});
