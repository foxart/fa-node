describe('is-mode', () => {
  const originalEnvironment = process.env.NODE_ENV;

  const loadMode = (
    environment?: string,
  ): {
    isDevMode: () => boolean;
    isProdMode: () => boolean;
    isStageMode: () => boolean;
    isTestMode: () => boolean;
  } => {
    if (environment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = environment;
    }

    let mode!: ReturnType<typeof loadMode>;
    jest.isolateModules(() => {
      mode = require('./is-mode') as ReturnType<typeof loadMode>;
    });
    return mode;
  };

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
    jest.resetModules();
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
    const mode = loadMode(environment);

    expect([mode.isDevMode(), mode.isProdMode(), mode.isStageMode(), mode.isTestMode()]).toStrictEqual(expected);
  });

  it('should default to local mode without NODE_ENV', () => {
    const mode = loadMode();

    expect(mode.isDevMode()).toBe(true);
  });

  it.each(['LOCAL', 'unknown'])('should reject an unknown %s mode', (environment) => {
    expect(() => loadMode(environment)).toThrow(`Invalid NODE_ENV: ${environment}`);
  });
});
