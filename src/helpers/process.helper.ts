import os from 'node:os';

export interface ProcessConfigInterface {
  shutdownHandler?: ProcessCallbackType<SignalType>;
  unhandledRejectionHandler?: ProcessCallbackType<unknown>;
  uncaughtExceptionHandler?: ProcessCallbackType<Error>;
  exitHandler?: ProcessCallbackType<ProcessExitCodeDescriptionInterface>;
}

type SignalType = NodeJS.Signals;
type ProcessEventType = 'unhandledRejection' | 'uncaughtException' | 'exit' | SignalType;
type ProcessCallbackType<T> = (payload: T) => void | Promise<void>;
type ProcessHandlerType = (...args: unknown[]) => void;
type ProcessHandlerEntryType = [event: ProcessEventType, handler: ProcessHandlerType];

interface ProcessExitCodeDescriptionInterface {
  code: number;
  message: string;
  signal?: SignalType;
}

class ProcessHelperClass {
  private static readonly exitSignals: SignalType[] = ['SIGTERM', 'SIGINT'];
  private static readonly logOnlySignals: SignalType[] = ['SIGHUP', 'SIGABRT', 'SIGUSR2'];
  private static readonly exitCode = 0;
  private static readonly maxListeners = 10;

  private static readonly signalByExitCodeMap = ProcessHelperClass.createSignalByExitCodeMap();

  private isHooked = false;
  private shutdownPromise: Promise<void> | null = null;
  private readonly handlerMap = new Map<ProcessEventType, ProcessHandlerType[]>();

  private static createSignalByExitCodeMap(): Map<number, NodeJS.Signals> {
    const signalByExitCodeMap = new Map<number, NodeJS.Signals>();

    for (const signal of [
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
    ] as const) {
      signalByExitCodeMap.set(128 + os.constants.signals[signal], signal);
    }

    return signalByExitCodeMap;
  }

  public hook(config: ProcessConfigInterface = {}): void {
    if (this.isHooked) {
      return;
    }

    process.setMaxListeners(ProcessHelperClass.maxListeners);

    for (const [event, handler] of this.buildHandlers(config)) {
      this.addHandler(event, handler);
      process.on(event, handler);
    }

    this.isHooked = true;
  }

  public unhook(): void {
    for (const [event, handlers] of this.handlerMap.entries()) {
      for (const handler of handlers) {
        process.off(event, handler);
      }
    }

    this.handlerMap.clear();
    this.isHooked = false;
    this.shutdownPromise = null;
  }

  private addHandler(event: ProcessEventType, handler: ProcessHandlerType): void {
    const handlerList = this.handlerMap.get(event) ?? [];
    handlerList.push(handler);
    this.handlerMap.set(event, handlerList);
  }

  private createHandlerEntry(event: ProcessEventType, handler: ProcessHandlerType): ProcessHandlerEntryType {
    return [event, handler];
  }

  private buildHandlers(config: ProcessConfigInterface): ProcessHandlerEntryType[] {
    const handlerList: ProcessHandlerEntryType[] = [];

    if (config.unhandledRejectionHandler) {
      const callback = config.unhandledRejectionHandler;
      handlerList.push(
        this.createHandlerEntry('unhandledRejection', (reason: unknown): void => {
          this.runCallback(callback, reason);
        }),
      );
    }

    if (config.uncaughtExceptionHandler) {
      const callback = config.uncaughtExceptionHandler;
      handlerList.push(
        this.createHandlerEntry('uncaughtException', (error: Error): void => {
          this.runCallback(callback, error);
        }),
      );
    }

    for (const signal of ProcessHelperClass.exitSignals) {
      handlerList.push(
        this.createHandlerEntry(signal, (): void => {
          void this.handleSignal(signal, config.shutdownHandler);
        }),
      );
    }

    for (const signal of ProcessHelperClass.logOnlySignals) {
      handlerList.push(
        this.createHandlerEntry(signal, (): void => {
          return;
        }),
      );
    }

    if (config.exitHandler) {
      const callback = config.exitHandler;
      handlerList.push(
        this.createHandlerEntry('exit', (code: number): void => {
          this.runCallback(callback, this.describeExitCode(code));
        }),
      );
    }

    return handlerList;
  }

  private async handleSignal(signal: SignalType, shutdownHandler?: ProcessCallbackType<SignalType>): Promise<void> {
    await this.runShutdownHandler(signal, shutdownHandler);
    process.exit(ProcessHelperClass.exitCode);
  }

  private async runShutdownHandler(
    signal: SignalType,
    shutdownHandler?: ProcessCallbackType<SignalType>,
  ): Promise<void> {
    if (!shutdownHandler) {
      return;
    }

    if (!this.shutdownPromise) {
      this.shutdownPromise = Promise.resolve(shutdownHandler(signal)).finally(() => {
        this.shutdownPromise = null;
      });
    }

    await this.shutdownPromise;
  }

  private runCallback<T>(callback: ProcessCallbackType<T>, payload: T): void {
    void Promise.resolve(callback(payload));
  }

  private describeExitCode(code: number): ProcessExitCodeDescriptionInterface {
    const signal = ProcessHelperClass.signalByExitCodeMap.get(code);

    switch (code) {
      case 0:
        return {
          code,
          message: 'Exited with code 0 (success)',
        };
      case 1:
        return {
          code,
          message: 'Exited with code 1 (general error)',
        };
      default:
        return {
          code,
          signal,
          message: signal ? `Exited with code ${code} (signal-derived: ${signal})` : `Exited with code ${code}`,
        };
    }
  }
}

export const ProcessHelper = new ProcessHelperClass();
