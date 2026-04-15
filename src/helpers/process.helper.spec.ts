import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ProcessHelper } from './process.helper';

describe('ProcessHelper', () => {
  const flushPromises = async (): Promise<void> =>
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

  beforeEach(() => {
    ProcessHelper.unhook();
  });

  afterEach(() => {
    ProcessHelper.unhook();
  });

  it('should await shutdown handler before exit on exit signal', async () => {
    const signalHandler = jest.fn<(signal: NodeJS.Signals) => void>();
    const shutdownHandler = jest.fn(() => Promise.resolve());
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ProcessHelper.hook({
      shutdownHandler,
      signalHandler,
    });

    process.emit('SIGTERM');
    await flushPromises();

    expect(signalHandler).toHaveBeenCalledWith('SIGTERM');
    expect(shutdownHandler).toHaveBeenCalledWith('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('should not attach error handlers by default', () => {
    ProcessHelper.hook();

    expect(process.listeners('uncaughtException')).toHaveLength(0);
    expect(process.listeners('unhandledRejection')).toHaveLength(0);
  });

  it('should keep graceful signals and log-only signals enabled by default when shutdown handler exists', async () => {
    const signalHandler = jest.fn<(signal: NodeJS.Signals) => void>();
    const shutdownHandler = jest.fn(() => Promise.resolve());
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ProcessHelper.hook({
      shutdownHandler,
      signalHandler,
    });

    process.emit('SIGUSR2');
    await flushPromises();
    process.emit('SIGINT');
    await flushPromises();

    expect(signalHandler).toHaveBeenNthCalledWith(1, 'SIGUSR2');
    expect(signalHandler).toHaveBeenNthCalledWith(2, 'SIGINT');
    expect(shutdownHandler).toHaveBeenCalledTimes(1);
    expect(shutdownHandler).toHaveBeenCalledWith('SIGINT');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('should not duplicate log-only signal that is also configured as exit signal', async () => {
    const signalHandler = jest.fn<(signal: NodeJS.Signals) => void>();

    ProcessHelper.hook({
      exitSignals: ['SIGTERM'],
      logOnlySignals: ['SIGTERM', 'SIGUSR2'],
      signalHandler,
    });

    process.emit('SIGTERM');
    await flushPromises();

    expect(signalHandler).toHaveBeenCalledTimes(1);
    expect(signalHandler).toHaveBeenCalledWith('SIGTERM');
  });

  it('should call uncaughtException handler when configured', async () => {
    const uncaughtExceptionHandler = jest.fn(() => Promise.resolve());
    const error = new Error('boom');

    ProcessHelper.hook({
      exitSignals: [],
      logOnlySignals: [],
      uncaughtExceptionHandler,
    });

    process.emit('uncaughtException', error);
    await flushPromises();

    expect(uncaughtExceptionHandler).toHaveBeenCalledWith(error);
  });

  it('should call unhandledRejection handler when configured', async () => {
    const unhandledRejectionHandler = jest.fn(() => Promise.resolve());
    const reason = new Error('reject');

    ProcessHelper.hook({
      exitSignals: [],
      logOnlySignals: [],
      unhandledRejectionHandler,
    });

    process.emit('unhandledRejection', reason, Promise.resolve());
    await flushPromises();

    expect(unhandledRejectionHandler).toHaveBeenCalledWith(reason);
  });

  it('should call exit handler with raw exit code', async () => {
    const exitHandler = jest.fn<(code: number) => void>();

    ProcessHelper.hook({
      exitSignals: [],
      logOnlySignals: [],
      exitHandler,
    });

    process.emit('exit', 128 + os.constants.signals.SIGTERM);
    await flushPromises();

    expect(exitHandler).toHaveBeenCalledWith(143);
  });
});
