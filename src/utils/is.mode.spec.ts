describe('is-mode', () => {
  const originalEnvironment = process.env.NODE_ENV;

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
    ['unknown', [true, false, false, false]],
  ])('should classify %s mode', (environment, expected) => {
    process.env.NODE_ENV = environment;
    jest.resetModules();
    const mode = jest.requireActual<typeof import('./is-mode')>('./is-mode');

    expect([mode.isDevMode(), mode.isProdMode(), mode.isStageMode(), mode.isTestMode()]).toStrictEqual(expected);
  });

  it('should default to local mode without NODE_ENV', () => {
    delete process.env.NODE_ENV;
    jest.resetModules();
    const mode = jest.requireActual<typeof import('./is-mode')>('./is-mode');

    expect(mode.isDevMode()).toBe(true);
  });
});
