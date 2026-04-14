import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { ProcessHelper, ProcessLoggerInterface } from './process.helper';

describe('ProcessHelper', () => {
  const createLogger = (): jest.Mocked<ProcessLoggerInterface> => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  });

  beforeEach(() => {
    ProcessHelper.unhook();
  });

  afterEach(() => {
    ProcessHelper.unhook();
  });

  it('should log SIGUSR2 as exit signal and stop the process', () => {
    const logger = createLogger();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ProcessHelper.hook(logger, {
      exitSignals: ['SIGTERM', 'SIGINT', 'SIGUSR2'],
      logOnlySignals: [],
      handleErrors: false,
      handleExit: false,
      exitOnSignal: true,
    });

    process.emit('SIGUSR2');

    expect(logger.warn.mock.calls).toContainEqual(['SIGUSR2']);
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('should not duplicate log-only signal that is also configured as exit signal', () => {
    const logger = createLogger();

    ProcessHelper.hook(logger, {
      exitSignals: ['SIGTERM'],
      logOnlySignals: ['SIGTERM', 'SIGUSR2'],
      handleErrors: false,
      handleExit: false,
    });

    process.emit('SIGTERM');

    expect(logger.warn.mock.calls).toHaveLength(1);
    expect(logger.warn.mock.calls).toContainEqual(['SIGTERM']);
  });

  it('should log uncaughtException without exiting when exit is disabled', () => {
    const logger = createLogger();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const error = new Error('boom');

    ProcessHelper.hook(logger, {
      handleErrors: true,
      handleExit: false,
      exitSignals: [],
      logOnlySignals: [],
      exitOnUncaughtException: false,
    });

    process.emit('uncaughtException', error);

    expect(logger.error.mock.calls).toContainEqual([error]);
    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it('should log unhandledRejection without exiting when exit is disabled', () => {
    const logger = createLogger();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const reason = new Error('reject');

    ProcessHelper.hook(logger, {
      handleErrors: true,
      handleExit: false,
      exitSignals: [],
      logOnlySignals: [],
      exitOnUnhandledRejection: false,
    });

    process.emit('unhandledRejection', reason, Promise.resolve());

    expect(logger.error.mock.calls).toContainEqual([reason]);
    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });
});
