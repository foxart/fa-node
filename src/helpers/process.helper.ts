type SignalType = NodeJS.Signals;
type ProcessEventType = 'unhandledRejection' | 'uncaughtException' | 'exit' | SignalType;
type ProcessCallbackType<T> = (payload: T) => void | Promise<void>;
type ProcessHandlerByEventType = {
  unhandledRejection: (reason: unknown) => void;
  uncaughtException: (error: Error) => void;
  exit: (code: number) => void;
} & Record<SignalType, () => void>;
type ProcessHandlerType = ProcessHandlerByEventType[ProcessEventType];
type ProcessHandlerEntryType = {
  [Event in ProcessEventType]: [Event, ProcessHandlerByEventType[Event]];
}[ProcessEventType];

export interface ProcessConfigInterface {
  exitSignals?: SignalType[];
  logOnlySignals?: SignalType[];
  shutdownHandler?: ProcessCallbackType<SignalType>;
  signalHandler?: ProcessCallbackType<SignalType>;
  unhandledRejectionHandler?: ProcessCallbackType<unknown>;
  uncaughtExceptionHandler?: ProcessCallbackType<Error>;
  exitHandler?: ProcessCallbackType<number>;
  exitOnSignal?: boolean;
  exitCode?: number;
  maxListeners?: number;
  customHandlers?: ProcessHandlerEntryType[];
}

type ProcessResolvedConfigType = {
  exitSignals: SignalType[];
  logOnlySignals: SignalType[];
  shutdownHandler?: ProcessCallbackType<SignalType>;
  signalHandler?: ProcessCallbackType<SignalType>;
  unhandledRejectionHandler?: ProcessCallbackType<unknown>;
  uncaughtExceptionHandler?: ProcessCallbackType<Error>;
  exitHandler?: ProcessCallbackType<number>;
  exitOnSignal: boolean;
  exitCode: number;
  maxListeners: number;
  customHandlers: ProcessHandlerEntryType[];
};

const defaultProcessConfig: ProcessResolvedConfigType = {
  exitSignals: ['SIGTERM', 'SIGINT'],
  logOnlySignals: ['SIGHUP', 'SIGABRT', 'SIGUSR2'],
  shutdownHandler: undefined,
  signalHandler: undefined,
  unhandledRejectionHandler: undefined,
  uncaughtExceptionHandler: undefined,
  exitHandler: undefined,
  exitOnSignal: false,
  exitCode: 0,
  maxListeners: 10,
  customHandlers: [],
};

class ProcessHelperClass {
  private isHooked = false;
  private shutdownPromise: Promise<void> | null = null;
  private readonly handlerMap = new Map<ProcessEventType, ProcessHandlerType[]>();

  public hook(config: ProcessConfigInterface = {}): void {
    if (this.isHooked) {
      return;
    }

    const normalizedConfig = this.normalizeConfig(config);
    process.setMaxListeners(normalizedConfig.maxListeners);

    for (const [event, handler] of this.buildHandlers(normalizedConfig)) {
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

  private normalizeConfig(config: ProcessConfigInterface): ProcessResolvedConfigType {
    const exitSignals = config.exitSignals ?? defaultProcessConfig.exitSignals;
    const logOnlySignals = (config.logOnlySignals ?? defaultProcessConfig.logOnlySignals).filter(
      (signal) => !exitSignals.includes(signal),
    );
    const exitOnSignal =
      config.exitOnSignal ?? (config.shutdownHandler !== undefined || defaultProcessConfig.exitOnSignal);

    return {
      ...defaultProcessConfig,
      ...config,
      exitSignals,
      logOnlySignals,
      exitOnSignal,
      customHandlers: config.customHandlers ?? defaultProcessConfig.customHandlers,
    };
  }

  private addHandler(event: ProcessEventType, handler: ProcessHandlerType): void {
    const handlerList = this.handlerMap.get(event) ?? [];
    handlerList.push(handler);
    this.handlerMap.set(event, handlerList);
  }

  private createHandlerEntry<Event extends ProcessEventType>(
    event: Event,
    handler: ProcessHandlerByEventType[Event],
  ): ProcessHandlerEntryType {
    return [event, handler] as ProcessHandlerEntryType;
  }

  private buildHandlers(config: ProcessResolvedConfigType): ProcessHandlerEntryType[] {
    const handlerList: ProcessHandlerEntryType[] = [...config.customHandlers];

    if (config.unhandledRejectionHandler) {
      const callback = config.unhandledRejectionHandler;
      handlerList.push(
        this.createHandlerEntry('unhandledRejection', (reason: unknown): void => {
          void Promise.resolve(callback(reason));
        }),
      );
    }

    if (config.uncaughtExceptionHandler) {
      const callback = config.uncaughtExceptionHandler;
      handlerList.push(
        this.createHandlerEntry('uncaughtException', (error: Error): void => {
          void Promise.resolve(callback(error));
        }),
      );
    }

    for (const signal of config.exitSignals) {
      handlerList.push(
        this.createHandlerEntry(signal, (): void => {
          void this.handleSignal(signal, config, true);
        }),
      );
    }

    for (const signal of config.logOnlySignals) {
      handlerList.push(
        this.createHandlerEntry(signal, (): void => {
          void this.handleSignal(signal, config, false);
        }),
      );
    }

    if (config.exitHandler) {
      const callback = config.exitHandler;
      handlerList.push(
        this.createHandlerEntry('exit', (code: number): void => {
          void Promise.resolve(callback(code));
        }),
      );
    }

    return handlerList;
  }

  private async handleSignal(
    signal: SignalType,
    config: ProcessResolvedConfigType,
    shouldExit: boolean,
  ): Promise<void> {
    if (config.signalHandler) {
      await Promise.resolve(config.signalHandler(signal));
    }

    if (!shouldExit || !config.exitOnSignal) {
      return;
    }

    await this.runShutdownHandler(signal, config.shutdownHandler);
    process.exit(config.exitCode);
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
}

export const ProcessHelper = new ProcessHelperClass();
