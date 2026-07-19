import { RandomHelper } from './random.helper';

describe('RandomHelper', () => {
  it('should generate random boolean', () => {
    const results = new Set(Array.from({ length: 20 }, () => RandomHelper.boolean()));
    expect(results.size).toBeGreaterThan(1);
  });

  it('should generate random integer in range', () => {
    const val = RandomHelper.integer(5, 10);
    expect(val).toBeGreaterThanOrEqual(5);
    expect(val).toBeLessThanOrEqual(10);
  });

  it('should generate random float in range', () => {
    const val = RandomHelper.float(1, 2);
    expect(val).toBeGreaterThanOrEqual(1);
    expect(val).toBeLessThanOrEqual(3);
  });

  it('should generate random color in hex', () => {
    const color = RandomHelper.color();
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should generate random date in range', () => {
    const start = new Date(2000, 0, 1);
    const end = new Date(2020, 0, 1);
    const date = RandomHelper.date(start, end);
    expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(date.getTime()).toBeLessThanOrEqual(end.getTime());
  });

  it('should generate random string and word', () => {
    expect(RandomHelper.string(5)).toHaveLength(5);
    expect(RandomHelper.word(5)).toMatch(/^[A-Z][a-z]+$/);
    expect(RandomHelper.string()).toHaveLength(10);
    expect(RandomHelper.word()).toHaveLength(5);
  });

  it('should generate location and contact values', () => {
    expect(RandomHelper.city()).toBeTruthy();
    expect(RandomHelper.country()).toBeTruthy();
    expect(RandomHelper.street()).toBeTruthy();
    expect(RandomHelper.postalCode()).toBeTruthy();
    expect(RandomHelper.phone()).toMatch(/^\+\d+ \d+ \d+ \d+$/);
    expect(RandomHelper.phone('+1')).toMatch(/^\+1 \d+ \d+ \d+$/);
    expect(RandomHelper.domain()).toMatch(/^[a-z]+\.[a-z]+$/);
    expect(RandomHelper.domain('TEST')).toMatch(/\.test$/);
    expect(RandomHelper.email()).toContain('@');
    expect(RandomHelper.email('TEST')).toMatch(/\.test$/);
  });

  it('should generate a consistent address shape', () => {
    const address = RandomHelper.address();

    expect(address.city).toEqual(expect.any(String));
    expect(address.country).toEqual(expect.any(String));
    expect(address.countryCode).toEqual(expect.any(String));
    expect(address.postalCode).toEqual(expect.any(String));
    expect(address.street).toEqual(expect.any(String));
    expect(address.phone).toEqual(expect.any(String));
    expect(address.domain).toEqual(expect.any(String));
    expect(address.email).toEqual(expect.any(String));
  });
});
