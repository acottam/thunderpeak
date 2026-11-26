jest.mock('../src/queries/visits', () => ({
  createVisit: jest.fn(),
  createVisitHike: jest.fn(),
  createVisitCamping: jest.fn(),
  getUserVisits: jest.fn(),
  getUserParkStatus: jest.fn(),
  getUserScore: jest.fn(),
  parkExists: jest.fn(),
}));
jest.mock('../src/queries/users', () => ({ findUserById: jest.fn() }));

const visitQueries = require('../src/queries/visits');
const { requireAuth } = require('../src/middleware/auth');
const visitsRouter = require('../src/routes/visits');
const meRouter = require('../src/routes/me');
const { createVisitHandler, createVisitHikeHandler, createVisitCampingHandler } = visitsRouter.handlers;
const { listUserVisits, getUserPark, getUserScoreHandler } = meRouter.handlers;

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

describe('visit routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('protects each visit endpoint with requireAuth', () => {
    const endpoints = [
      [visitsRouter, 'post', '/'],
      [visitsRouter, 'post', '/:id/hikes'],
      [visitsRouter, 'post', '/:id/camping'],
      [meRouter, 'get', '/visits'],
      [meRouter, 'get', '/parks/:park_id'],
      [meRouter, 'get', '/score'],
    ];

    for (const [router, method, path] of endpoints) {
      const route = router.stack.find((layer) => layer.route?.path === path)?.route;
      expect(route).toBeDefined();
      expect(route.methods[method]).toBe(true);
      expect(route.stack[0].handle).toBe(requireAuth);
    }
  });

  test('POST /visits returns the park name, award and next eligible date', async () => {
    visitQueries.createVisit.mockResolvedValue({
      id: 12,
      park_id: 3,
      park_name: 'Zion National Park',
      visited_date: '2026-11-21',
      points_awarded: '50',
      next_eligible_date: '2027-11-21',
    });
    const res = createResponse();

    await createVisitHandler({ userId: 8, body: { park_id: 3 } }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      id: 12,
      park_id: 3,
      park_name: 'Zion National Park',
      visited_date: '2026-11-21',
      points_awarded: 50,
      next_eligible_date: '2027-11-21',
    });
    expect(visitQueries.createVisit).toHaveBeenCalledWith(8, 3, null);
  });

  test.each([
    [{ park_id: 0 }, 'park_id must be a positive integer'],
    [{ park_id: 3, visited_date: '2025-02-30' }, 'visited_date must be a date in the form YYYY-MM-DD and not in the future'],
    [{ park_id: 3, visited_date: 'not-a-date' }, 'visited_date must be a date in the form YYYY-MM-DD and not in the future'],
  ])('POST /visits rejects invalid input %j', async (body, message) => {
    const res = createResponse();

    await createVisitHandler({ userId: 8, body }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(message);
    expect(visitQueries.createVisit).not.toHaveBeenCalled();
  });

  test('POST /visits returns 404 for an unknown park', async () => {
    visitQueries.createVisit.mockResolvedValue({ notFound: true });
    const res = createResponse();

    await createVisitHandler({ userId: 8, body: { park_id: 99 } }, res);

    expect(res.statusCode).toBe(404);
  });

  test('POST /visits/:id/hikes records a valid hike difficulty', async () => {
    visitQueries.createVisitHike.mockResolvedValue({ id: 6, visit_id: 12, hike_difficulty_id: 2 });
    const res = createResponse();
    await createVisitHikeHandler({ userId: 8, params: { id: '12' }, body: { hike_difficulty_id: 2 } }, res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 6, visit_id: 12, hike_difficulty_id: 2 });
    expect(visitQueries.createVisitHike).toHaveBeenCalledWith(8, 12, 2);
  });

  test.each([
    [{ id: 'bad', body: { hike_difficulty_id: 2 } }, 'visit id must be a positive integer'],
    [{ id: '12', body: { hike_difficulty_id: 0 } }, 'hike_difficulty_id must be a positive integer'],
  ])('POST /visits/:id/hikes validates input', async (input, message) => {
    const res = createResponse();
    await createVisitHikeHandler({ userId: 8, params: { id: input.id }, body: input.body }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(message);
    expect(visitQueries.createVisitHike).not.toHaveBeenCalled();
  });

  test('POST /visits/:id/camping records camping on the visit', async () => {
    visitQueries.createVisitCamping.mockResolvedValue({ id: 7, visit_id: 12, activity_id: 2, activity: 'Camping' });
    const res = createResponse();
    await createVisitCampingHandler({ userId: 8, params: { id: '12' } }, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.activity).toBe('Camping');
    expect(visitQueries.createVisitCamping).toHaveBeenCalledWith(8, 12);
  });

  test('POST /visits/:id/camping validates the visit ID', async () => {
    const res = createResponse();
    await createVisitCampingHandler({ userId: 8, params: { id: '0' } }, res);
    expect(res.statusCode).toBe(400);
    expect(visitQueries.createVisitCamping).not.toHaveBeenCalled();
  });

  test('GET /me/visits filters by park and converts awarded points to a number', async () => {
    visitQueries.getUserVisits.mockResolvedValue([{
      id: 12,
      park_id: 3,
      park_name: 'Zion National Park',
      visited_date: '2026-11-21',
      points_awarded: '50',
    }]);
    const res = createResponse();

    await listUserVisits({ userId: 8, query: { park_id: '3' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body[0].points_awarded).toBe(50);
    expect(visitQueries.getUserVisits).toHaveBeenCalledWith(8, 3);
  });

  test('GET /me/visits rejects an invalid park filter', async () => {
    const res = createResponse();

    await listUserVisits({ userId: 8, query: { park_id: 'bad' } }, res);

    expect(res.statusCode).toBe(400);
    expect(visitQueries.getUserVisits).not.toHaveBeenCalled();
  });

  test('GET /me/parks/:park_id returns visit dates and eligibility', async () => {
    visitQueries.parkExists.mockResolvedValue(true);
    visitQueries.getUserParkStatus.mockResolvedValue({
      visit_count: '2',
      last_visited_date: '2026-11-21',
      last_awarded_date: '2026-03-02',
      next_eligible_date: '2027-03-02',
      can_earn_points_now: false,
    });
    const res = createResponse();

    await getUserPark({ userId: 8, params: { park_id: '3' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      park_id: 3,
      visit_count: 2,
      last_visited_date: '2026-11-21',
      last_awarded_date: '2026-03-02',
      next_eligible_date: '2027-03-02',
      can_earn_points_now: false,
    });
    expect(visitQueries.getUserParkStatus).toHaveBeenCalledWith(8, 3);
  });

  test('GET /me/parks/:park_id returns 404 for a missing park', async () => {
    visitQueries.parkExists.mockResolvedValue(false);
    const res = createResponse();

    await getUserPark({ userId: 8, params: { park_id: '404' } }, res);

    expect(res.statusCode).toBe(404);
    expect(visitQueries.getUserParkStatus).not.toHaveBeenCalled();
  });

  test('GET /me/score converts view totals to JSON numbers', async () => {
    visitQueries.getUserScore.mockResolvedValue({ total_points: '125', visit_count: '3' });
    const res = createResponse();

    await getUserScoreHandler({ userId: 8 }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ total_points: 125, visit_count: 3 });
    expect(visitQueries.getUserScore).toHaveBeenCalledWith(8);
  });
});
