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
  });
});
