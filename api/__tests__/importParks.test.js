jest.mock('../src/db', () => ({ query: jest.fn(), connect: jest.fn(), end: jest.fn() }));

const { isParkOrMonument } = require('../scripts/import-parks');

const site = (designation, parkCode = 'abcd') => ({ designation, parkCode, fullName: 'Test' });

describe('import filter: parks and monuments only', () => {
  test.each([
    ['National Park'],
    ['National Park & Preserve'],
    ['National Parks'],
    ['National Monument'],
    ['National Monument & Preserve'],
    ['National Monument and Historic Shrine'],
  ])('keeps designation "%s"', (designation) => {
    expect(isParkOrMonument(site(designation))).toBe(true);
  });

  test('keeps the two parks NPS does not label National Park', () => {
    expect(isParkOrMonument(site('National and State Parks', 'redw'))).toBe(true);
    expect(isParkOrMonument(site('', 'npsa'))).toBe(true);
  });

  test.each([
    ['National Historic Site'],
    ['National Historical Park'],
    ['National Memorial'],
    ['National Recreation Area'],
    ['National Battlefield'],
    ['National Seashore'],
    ['National Preserve'],
    ['National Historic Trail'],
    ['Part of Statue of Liberty National Monument'],
    [''],
    [undefined],
  ])('drops designation %j', (designation) => {
    expect(isParkOrMonument(site(designation))).toBe(false);
  });

  test('a park code outside the two exceptions does not get in on its own', () => {
    expect(isParkOrMonument(site('', 'wamo'))).toBe(false);
  });
});
