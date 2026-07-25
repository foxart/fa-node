import { isDevMode, isProdMode, isStageMode, isTestMode } from './is-mode';

describe('is-mode', () => {
  const originalEnvironment = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
  });

  it.each([
    ['local', [true, false, false, false]],
    ['development', [true, false, false, false]],
    ['dev', [true, false, false, false]],
    ['production', [false, true, false, false]],
    ['prod', [false, true, false, false]],
    ['staging', [false, false, true, false]],
    ['stage', [false, false, true, false]],
    ['test', [false, false, false, true]],
  ])('should classify %s mode', (environment, expected) => {
    process.env.NODE_ENV = environment;

    expect([isDevMode(), isProdMode(), isStageMode(), isTestMode()]).toStrictEqual(expected);
  });

  it('should default to local mode without NODE_ENV', () => {
    delete process.env.NODE_ENV;

    expect(isDevMode()).toBe(true);
  });

  it.each(['local1', 'ЛОКАЛ', 'unknown'])('should reject an unknown %s mode', (environment) => {
    process.env.NODE_ENV = environment;

    expect(isDevMode).toThrow(`Invalid NODE_ENV: ${environment}`);
  });
});
