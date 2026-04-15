import os from 'node:os';
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { ProcessHelper, ProcessLoggerInterface } from './process.helper';

describe('ProcessHelper', () => {
  const flushPromises = async (): Promise<void> =>
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

  const createLogger = (): jest.Mocked<ProcessLoggerInterface> => ({
    errorWithStack: jest.fn(),
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

  it('should await shutdown handler before exit on exit signal', async () => {
    const logger = createLogger();
    const shutdownHandler = jest.fn(() => Promise.resolve());
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ProcessHelper.hook(logger, {
      handleExit: false,
      shutdownHandler,
    });

    process.emit('SIGTERM');
    await flushPromises();

    expect(logger.warn.mock.calls).toContainEqual(['SIGTERM']);
    expect(shutdownHandler).toHaveBeenCalledWith('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('should not attach error handlers by default', () => {
    const logger = createLogger();

    ProcessHelper.hook(logger, {
      handleExit: false,
    });

    expect(process.listeners('uncaughtException')).toHaveLength(0);
    expect(process.listeners('unhandledRejection')).toHaveLength(0);
  });

  it('should keep graceful signals and log-only signals enabled by default when shutdown handler exists', async () => {
    const logger = createLogger();
    const shutdownHandler = jest.fn(() => Promise.resolve());
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ProcessHelper.hook(logger, {
      handleExit: false,
      shutdownHandler,
    });

    process.emit('SIGUSR2');
    await flushPromises();
    process.emit('SIGINT');
    await flushPromises();

    expect(logger.warn.mock.calls).toContainEqual(['SIGUSR2']);
    expect(logger.warn.mock.calls).toContainEqual(['SIGINT']);
    expect(shutdownHandler).toHaveBeenCalledTimes(1);
    expect(shutdownHandler).toHaveBeenCalledWith('SIGINT');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('should log SIGUSR2 without exiting by default', async () => {
    const logger = createLogger();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ProcessHelper.hook(logger, {
      handleExit: false,
      exitOnSignal: true,
    });

    process.emit('SIGUSR2');
    await flushPromises();

    expect(logger.warn.mock.calls).toContainEqual(['SIGUSR2']);
    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it('should not duplicate log-only signal that is also configured as exit signal', () => {
    const logger = createLogger();

    ProcessHelper.hook(logger, {
      exitSignals: ['SIGTERM'],
      logOnlySignals: ['SIGTERM', 'SIGUSR2'],
      handleExit: false,
    });

    process.emit('SIGTERM');

    expect(logger.warn.mock.calls).toHaveLength(1);
    expect(logger.warn.mock.calls).toContainEqual(['SIGTERM']);
  });

  it('should log uncaughtException and call custom handler', async () => {
    const logger = createLogger();
    const uncaughtExceptionHandler = jest.fn(() => Promise.resolve());
    const errorWithStack = logger.errorWithStack as jest.MockedFunction<
      NonNullable<ProcessLoggerInterface['errorWithStack']>
    >;
    const error = new Error('boom');

    ProcessHelper.hook(logger, {
      handleExit: false,
      exitSignals: [],
      logOnlySignals: [],
      uncaughtExceptionHandler,
    });

    process.emit('uncaughtException', error);
    await flushPromises();

    expect(errorWithStack.mock.calls).toHaveLength(1);
    expect(errorWithStack.mock.calls[0]?.[0]).toContain('at ProcessHelper.uncaughtException');
    expect(errorWithStack.mock.calls[0]?.[1]).toBe(error);
    expect(uncaughtExceptionHandler).toHaveBeenCalledWith(error);
  });

  it('should log unhandledRejection and call custom handler', async () => {
    const logger = createLogger();
    const unhandledRejectionHandler = jest.fn(() => Promise.resolve());
    const errorWithStack = logger.errorWithStack as jest.MockedFunction<
      NonNullable<ProcessLoggerInterface['errorWithStack']>
    >;
    const reason = new Error('reject');

    ProcessHelper.hook(logger, {
      handleExit: false,
      exitSignals: [],
      logOnlySignals: [],
      unhandledRejectionHandler,
    });

    process.emit('unhandledRejection', reason, Promise.resolve());
    await flushPromises();

    expect(errorWithStack.mock.calls).toHaveLength(1);
    expect(errorWithStack.mock.calls[0]?.[0]).toContain('at ProcessHelper.unhandledRejection');
    expect(errorWithStack.mock.calls[0]?.[1]).toBe(reason);
    expect(unhandledRejectionHandler).toHaveBeenCalledWith(reason);
  });

  it('should describe exit event as exit code, not as raw signal name', () => {
    const logger = createLogger();

    ProcessHelper.hook(logger, {
      handleExit: true,
      exitSignals: [],
      logOnlySignals: [],
    });

    process.emit('exit', 128 + os.constants.signals.SIGTERM);

    expect(logger.debug.mock.calls).toContainEqual(['Exited with code 143 (signal-derived: SIGTERM)']);
  });
});
