import os from 'node:os';

type Signal = NodeJS.Signals;
type ProcessEvent = Signal | 'uncaughtException' | 'unhandledRejection' | 'exit';
type ProcessHandler = (...args: unknown[]) => void;
type ProcessCallback<T> = (payload: T) => void | Promise<void>;

export interface ProcessExitCodeDescriptionInterface {
  code: number;
  message: string;
  signal?: Signal;
}

export interface ProcessConfigInterface {
  shutdownHandler?: ProcessCallback<Signal>;
  uncaughtExceptionHandler?: ProcessCallback<Error>;
  unhandledRejectionHandler?: ProcessCallback<unknown>;
  exitHandler?: ProcessCallback<ProcessExitCodeDescriptionInterface>;
}

class ProcessHelperClass {
  private static readonly exitSignals: Signal[] = ['SIGTERM', 'SIGINT'];
  private static readonly logOnlySignals: Signal[] = ['SIGHUP', 'SIGABRT', 'SIGUSR2'];
  private static readonly exitCode = 0;
  private static readonly maxListeners = 10;
  private static readonly exitSignalByCode = new Map<number, Signal>(
    (
      [
        'SIGABRT',
        'SIGALRM',
        'SIGHUP',
        'SIGINT',
        'SIGKILL',
        'SIGPIPE',
        'SIGQUIT',
        'SIGSEGV',
        'SIGTERM',
        'SIGTRAP',
      ] as const
    ).map((signal) => [128 + os.constants.signals[signal], signal]),
  );

  private isHooked = false;
  private shutdownPromise: Promise<void> | null = null;
  private readonly handlers = new Map<ProcessEvent, ProcessHandler[]>();

  public hook(config: ProcessConfigInterface = {}): void {
    if (this.isHooked) {
      return;
    }

    process.setMaxListeners(ProcessHelperClass.maxListeners);

    for (const [event, handler] of this.buildHandlers(config)) {
      const eventHandlers = this.handlers.get(event) ?? [];
      eventHandlers.push(handler);
      this.handlers.set(event, eventHandlers);
      process.on(event, handler);
    }

    this.isHooked = true;
  }

  public unhook(): void {
    for (const [event, handlers] of this.handlers.entries()) {
      for (const handler of handlers) {
        process.off(event, handler);
      }
    }

    this.handlers.clear();
    this.isHooked = false;
    this.shutdownPromise = null;
  }

  private buildHandlers(config: ProcessConfigInterface): Array<[ProcessEvent, ProcessHandler]> {
    const handlers: Array<[ProcessEvent, ProcessHandler]> = [];

    if (config.unhandledRejectionHandler) {
      const callback = config.unhandledRejectionHandler;
      handlers.push([
        'unhandledRejection',
        (reason: unknown): void => {
          this.runCallback(callback, reason);
        },
      ]);
    }

    if (config.uncaughtExceptionHandler) {
      const callback = config.uncaughtExceptionHandler;
      handlers.push([
        'uncaughtException',
        (error: Error): void => {
          this.runCallback(callback, error);
        },
      ]);
    }

    for (const signal of ProcessHelperClass.exitSignals) {
      handlers.push([
        signal,
        (): void => {
          void this.handleExitSignal(signal, config.shutdownHandler);
        },
      ]);
    }

    for (const signal of ProcessHelperClass.logOnlySignals) {
      handlers.push([signal, (): void => undefined]);
    }

    if (config.exitHandler) {
      const callback = config.exitHandler;
      handlers.push([
        'exit',
        (code: number): void => {
          this.runCallback(callback, this.describeExitCode(code));
        },
      ]);
    }

    return handlers;
  }

  private async handleExitSignal(signal: Signal, shutdownHandler?: ProcessCallback<Signal>): Promise<void> {
    if (shutdownHandler) {
      if (!this.shutdownPromise) {
        this.shutdownPromise = Promise.resolve(shutdownHandler(signal)).finally(() => {
          this.shutdownPromise = null;
        });
      }

      await this.shutdownPromise;
    }

    process.exit(ProcessHelperClass.exitCode);
  }

  private runCallback<T>(callback: ProcessCallback<T>, payload: T): void {
    void Promise.resolve(callback(payload));
  }

  private describeExitCode(code: number): ProcessExitCodeDescriptionInterface {
    const signal = ProcessHelperClass.exitSignalByCode.get(code);

    if (code === 0) {
      return { code, message: 'Exited with code 0 (success)' };
    }
    if (code === 1) {
      return { code, message: 'Exited with code 1 (general error)' };
    }

    return {
      code,
      signal,
      message: signal ? `Exited with code ${code} (signal-derived: ${signal})` : `Exited with code ${code}`,
    };
  }
}

export const ProcessHelper = new ProcessHelperClass();
