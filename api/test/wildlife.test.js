jest.mock('../src/queries/wildlife', () => ({
  listAnimals: jest.fn(),
  createSighting: jest.fn(),
}));
jest.mock('../src/queries/users', () => ({ findUserById: jest.fn() }));

const wildlife = require('../src/queries/wildlife');
const { requireAuth } = require('../src/middleware/auth');
const visitsRouter = require('../src/routes/visits');
const animalsRouter = require('../src/routes/animals');
const { createSightingHandler } = visitsRouter.handlers;
const { listAnimalsHandler } = animalsRouter.handlers;

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; },
  };
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('GET /animals', () => {
  test('is public and converts database decimals to JSON numbers', async () => {
    const route = animalsRouter.stack.find((layer) => layer.route?.path === '/')?.route;
    expect(route.methods.get).toBe(true);
    expect(route.stack[0].handle).not.toBe(requireAuth);

    wildlife.listAnimals.mockResolvedValue([{
      id: 2, name: 'Grizzly Bear', base_points: 10, rarity_multiplier: '3.50', point_value: 35, description: 'Apex predator',
    }]);
    const res = createResponse();
    await listAnimalsHandler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{
      id: 2, name: 'Grizzly Bear', base_points: 10, rarity_multiplier: 3.5, point_value: 35, description: 'Apex predator',
    }]);
  });

  test('database errors return 503', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    wildlife.listAnimals.mockRejectedValue(new Error('down'));
    const res = createResponse();
    await listAnimalsHandler({}, res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ status: 'error', message: 'Animal list unavailable' });
  });
});

describe('POST /visits/:id/sightings', () => {
  test('requires sign-in', () => {
    const route = visitsRouter.stack.find((layer) => layer.route?.path === '/:id/sightings')?.route;
    expect(route.methods.post).toBe(true);
    expect(route.stack[0].handle).toBe(requireAuth);
  });

  test('returns 201 with the award as a number and the next eligible date', async () => {
    wildlife.createSighting.mockResolvedValue({
      id: 44, visit_id: 12, animal_id: 2, name: 'Grizzly Bear', points_awarded: '35', next_eligible_date: '2027-11-21',
    });
    const res = createResponse();
    await createSightingHandler({ userId: 8, params: { id: '12' }, body: { animal_id: 2 } }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      id: 44, visit_id: 12, animal_id: 2, name: 'Grizzly Bear', points_awarded: 35, next_eligible_date: '2027-11-21',
    });
    expect(wildlife.createSighting).toHaveBeenCalledWith(8, 12, 2);
  });

  test.each([
    [{ id: '0' }, { animal_id: 2 }, 'Visit id must be a positive integer'],
    [{ id: 'abc' }, { animal_id: 2 }, 'Visit id must be a positive integer'],
    [{ id: '12' }, {}, 'animal_id must be a positive integer'],
    [{ id: '12' }, { animal_id: -1 }, 'animal_id must be a positive integer'],
    [{ id: '12' }, { animal_id: 1.5 }, 'animal_id must be a positive integer'],
  ])('rejects params %j body %j without querying', async (params, body, message) => {
    const res = createResponse();
    await createSightingHandler({ userId: 8, params, body }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ status: 'error', message });
    expect(wildlife.createSighting).not.toHaveBeenCalled();
  });

  test.each([
    [{ visitNotFound: true }, 404, 'Visit not found'],
    [{ animalNotFound: true }, 404, 'Animal not found'],
    [{ duplicate: true }, 409, 'That animal is already logged for this visit'],
  ])('maps %j to %i', async (result, status, message) => {
    wildlife.createSighting.mockResolvedValue(result);
    const res = createResponse();
    await createSightingHandler({ userId: 8, params: { id: '12' }, body: { animal_id: 2 } }, res);
    expect(res.statusCode).toBe(status);
    expect(res.body).toEqual({ status: 'error', message });
  });

  test('database errors return 503', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    wildlife.createSighting.mockRejectedValue(new Error('relation "scored_sightings" does not exist'));
    const res = createResponse();
    await createSightingHandler({ userId: 8, params: { id: '12' }, body: { animal_id: 2 } }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ status: 'error', message: 'Sightings unavailable' });
  });
});
