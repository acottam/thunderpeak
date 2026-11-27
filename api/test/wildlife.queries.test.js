jest.mock('../src/db', () => ({ query: jest.fn(), connect: jest.fn() }));

const pool = require('../src/db');
const { createSighting } = require('../src/queries/wildlife');

// A fake client that answers each query in order and records what was sent.
function fakeClient(answers) {
  const client = { sql: [], release: jest.fn() };
  client.query = jest.fn(async (sql) => {
    client.sql.push(sql.trim().split(/\s+/).slice(0, 3).join(' '));
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return {};
    const next = answers.shift();
    if (next instanceof Error) throw next;
    return next;
  });
  pool.connect.mockResolvedValue(client);
  return client;
}

beforeEach(() => jest.clearAllMocks());

test('checks the visit belongs to the user, inserts and reads the award', async () => {
  const row = { id: 44, visit_id: 12, animal_id: 2, name: 'Grizzly Bear', points_awarded: 35, next_eligible_date: '2027-11-21' };
  const client = fakeClient([{ rows: [{ id: 12 }] }, { rows: [{ name: 'Grizzly Bear' }] }, { rows: [{ id: 44 }] }, { rows: [row] }]);

  expect(await createSighting(8, 12, 2)).toEqual(row);
  expect(client.query.mock.calls[1]).toEqual(['SELECT id FROM visits WHERE id = $1 AND user_id = $2', [12, 8]]);
  expect(client.sql.at(-1)).toBe('COMMIT');
  expect(client.release).toHaveBeenCalled();
});

test("another user's visit reads as not found and nothing is inserted", async () => {
  const client = fakeClient([{ rows: [] }]);
  expect(await createSighting(8, 12, 2)).toEqual({ visitNotFound: true });
  expect(client.sql.some((s) => s.startsWith('INSERT'))).toBe(false);
  expect(client.sql.at(-1)).toBe('ROLLBACK');
});

test('an unknown animal reads as not found', async () => {
  fakeClient([{ rows: [{ id: 12 }] }, { rows: [] }]);
  expect(await createSighting(8, 12, 999)).toEqual({ animalNotFound: true });
});

test('the unique constraint is reported as a duplicate', async () => {
  const duplicate = Object.assign(new Error('duplicate key'), { code: '23505' });
  const client = fakeClient([{ rows: [{ id: 12 }] }, { rows: [{ name: 'Moose' }] }, duplicate]);
  expect(await createSighting(8, 12, 6)).toEqual({ duplicate: true });
  expect(client.sql.at(-1)).toBe('ROLLBACK');
  expect(client.release).toHaveBeenCalled();
});

test('other database errors roll back and are rethrown', async () => {
  const client = fakeClient([{ rows: [{ id: 12 }] }, { rows: [{ name: 'Moose' }] }, { rows: [{ id: 44 }] }, new Error('no view')]);
  await expect(createSighting(8, 12, 6)).rejects.toThrow('no view');
  expect(client.sql.at(-1)).toBe('ROLLBACK');
  expect(client.release).toHaveBeenCalled();
});
