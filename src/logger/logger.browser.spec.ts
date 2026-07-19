import { LoggerBrowser } from './logger.browser';

describe('LoggerBrowser', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return original arguments without metadata', () => {
    const logger = new LoggerBrowser();

    expect(logger.log('value')).toStrictEqual(['value']);
    expect(logger.info('value')).toStrictEqual(['value']);
    expect(logger.warn('value')).toStrictEqual(['value']);
    expect(logger.error('value')).toStrictEqual(['value']);
    expect(logger.debug('value')).toStrictEqual(['value']);
    expect(logger.custom('value')).toStrictEqual(['value']);
  });

  it('should render all configured browser metadata', () => {
    const logger = new LoggerBrowser({ color: true, info: true, name: 'browser', date: true, time: true, performance: true });

    for (const output of [logger.log('value'), logger.info('value'), logger.warn('value'), logger.error('value'), logger.debug('value'), logger.custom('value')]) {
      expect(output[0]).toContain('%c');
      expect(output).toContain('value');
    }
  });

  it('should support colorless metadata and console override/restore', () => {
    const logger = new LoggerBrowser({ info: true });
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(logger.log('value')).toContain('');
    logger.override();
    expect(() => console.log('value')).not.toThrow();
    logger.restore();
    consoleLog.mockRestore();
  });

  it('should initialize without a performance API', () => {
    const original = globalThis.performance;
    try {
      (globalThis as unknown as { performance?: typeof globalThis.performance }).performance = undefined;
      expect(new LoggerBrowser({ performance: true }).log('value')).toStrictEqual(['value']);
    } finally {
      globalThis.performance = original;
    }
  });
});
