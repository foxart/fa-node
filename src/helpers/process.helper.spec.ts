import os from 'node:os';
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
    const shutdownHandler = jest.fn(() => Promise.resolve());
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ProcessHelper.hook({
      shutdownHandler,
    });

    process.emit('SIGTERM');
    await flushPromises();

    expect(shutdownHandler).toHaveBeenCalledWith('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('should not attach error handlers by default', () => {
    ProcessHelper.hook();

    expect(process.listeners('uncaughtException')).toHaveLength(0);
    expect(process.listeners('unhandledRejection')).toHaveLength(0);
    expect(() => process.emit('SIGHUP')).not.toThrow();
    expect(() => process.emit('SIGABRT')).not.toThrow();
  });

  it('should gracefully shutdown on nodemon restart signal and other exit signals', async () => {
    const shutdownHandler = jest.fn(() => Promise.resolve());
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ProcessHelper.hook({
      shutdownHandler,
    });

    process.emit('SIGUSR2');
    await flushPromises();
    process.emit('SIGINT');
    await flushPromises();

    expect(shutdownHandler).toHaveBeenCalledTimes(2);
    expect(shutdownHandler).toHaveBeenNthCalledWith(1, 'SIGUSR2');
    expect(shutdownHandler).toHaveBeenNthCalledWith(2, 'SIGINT');
    expect(exitSpy).toHaveBeenCalledTimes(2);
    expect(exitSpy).toHaveBeenNthCalledWith(1, 0);
    expect(exitSpy).toHaveBeenNthCalledWith(2, 0);

    exitSpy.mockRestore();
  });

  it('should not duplicate log-only signal that is also configured as exit signal', async () => {
    const shutdownHandler = jest.fn(() => Promise.resolve());
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    ProcessHelper.hook({
      shutdownHandler,
    });

    process.emit('SIGTERM');
    await flushPromises();

    expect(shutdownHandler).toHaveBeenCalledTimes(1);
    expect(shutdownHandler).toHaveBeenCalledWith('SIGTERM');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('should call uncaughtException handler when configured', async () => {
    const uncaughtExceptionHandler = jest.fn(() => Promise.resolve());
    const error = new Error('boom');

    ProcessHelper.hook({
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
      unhandledRejectionHandler,
    });

    process.emit('unhandledRejection', reason, Promise.resolve());
    await flushPromises();

    expect(unhandledRejectionHandler).toHaveBeenCalledWith(reason);
  });

  it('should call exit handler with raw exit code', async () => {
    const exitHandler = jest.fn<void, [{ code: number; message: string; signal?: NodeJS.Signals }]>();

    ProcessHelper.hook({
      exitHandler,
    });

    process.emit('exit', 128 + os.constants.signals.SIGTERM);
    await flushPromises();

    expect(exitHandler).toHaveBeenCalledWith({
      code: 143,
      signal: 'SIGTERM',
      message: 'Exited with code 143 (signal: SIGTERM)',
    });
  });

  it('should use error exit code for a non-number exit payload', async () => {
    const exitHandler = jest.fn();
    ProcessHelper.hook({ exitHandler });

    (process.emit as (...args: unknown[]) => boolean)('exit', 'invalid');
    await flushPromises();

    expect(exitHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 1,
        message: 'Exited with code 1 (error)',
      }),
    );
  });

  it('should not hook the same process twice', () => {
    ProcessHelper.hook();
    const listenerCount = process.listeners('SIGTERM').length;

    ProcessHelper.hook();

    expect(process.listeners('SIGTERM')).toHaveLength(listenerCount);
  });

  it('should convert non-Error uncaught values', async () => {
    const uncaughtExceptionHandler = jest.fn();
    ProcessHelper.hook({ uncaughtExceptionHandler });

    (process.emit as (...args: unknown[]) => boolean)('uncaughtException', 'failure');
    await flushPromises();

    expect(uncaughtExceptionHandler).toHaveBeenCalledWith(expect.objectContaining({ message: 'failure' }));
  });

  it('should exit without a shutdown callback', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    ProcessHelper.hook();

    process.emit('SIGTERM');
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('should share a pending shutdown promise', async () => {
    let resolveShutdown: (() => void) | undefined;
    const shutdownHandler = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveShutdown = resolve;
        }),
    );
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    ProcessHelper.hook({ shutdownHandler });

    process.emit('SIGTERM');
    process.emit('SIGINT');
    expect(shutdownHandler).toHaveBeenCalledTimes(1);
    resolveShutdown?.();
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledTimes(2);
    exitSpy.mockRestore();
  });

  it.each([
    [0, 'Exited with code 0 (success)'],
    [1, 'Exited with code 1 (error)'],
    [2, 'Exited with code 2'],
  ])('should describe exit code %s', async (code, message) => {
    const exitHandler = jest.fn();
    ProcessHelper.hook({ exitHandler });

    process.emit('exit', code);
    await flushPromises();

    expect(exitHandler).toHaveBeenCalledWith(expect.objectContaining({ code, message }));
  });
});
