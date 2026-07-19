import { LoggerEnum } from './logger.map';
import { LoggerNest } from './logger.nest';

function invoke<R>(target: object, method: string, ...args: unknown[]): R {
  const callback = (target as Record<string, (...parameters: unknown[]) => unknown>)[method];
  return callback.apply(target, args) as R;
}

describe('LoggerNest', () => {
  let stdout: jest.SpyInstance;

  beforeEach(() => {
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should write Nest levels and skip the startup message', () => {
    const logger = new LoggerNest({ metadata: true });
    logger.log('log', 'Context'); logger.warn('warn', 'Context'); logger.warn('warn', 1); logger.debug('debug', 'Context'); logger.debug('debug', 1); logger.verbose('verbose', 'Context'); logger.verbose('verbose', 1); logger.fatal('fatal', 'Context'); logger.fatal('fatal', 1); logger.log('without context', 1); logger.log('Nest application successfully started');
    expect(stdout).toHaveBeenCalledTimes(10);
  });

  it('should normalize Nest error call shapes', () => {
    const logger = new LoggerNest({ errorStack: true });
    const stack = 'Error: failure\n    at Service.run (/tmp/file.ts:1:2)';
    logger.error('TypeError: failure', stack, { detail: true }, undefined, 'Context'); logger.error('failure', stack); logger.error(new Error('failure'), 'Context'); logger.error('plain', { detail: true }); logger.error(undefined);
    expect(stdout).toHaveBeenCalledTimes(4);
  });

  it('should print arrays, Nest contexts, HTTP methods, and metadata overrides', () => {
    const logger = new LoggerNest({ color: true, metadata: true });
    logger.print('LOG', { visible: true, frame: { file: 'src/file.ts', caller: 'NestFactory', method: 'log' } }, ['GET', '/path']);
    logger.print('LOG', { visible: false }, 'POST /path');
    logger.writeWithMetadata('LOG', { callerOverride: 'Override' }, 'value');
    expect(stdout).toHaveBeenCalledTimes(3);
  });

  it('should return uncolored Nest messages', () => {
    expect(invoke(new LoggerNest({}), 'colorizeMessage', 'GET /path', LoggerEnum.DEFAULT)).toBe('GET /path');
    expect(invoke(new LoggerNest({ color: true }), 'colorizeMessage', 'GET /path', LoggerEnum.DEFAULT)).toContain('GET');
  });
});
