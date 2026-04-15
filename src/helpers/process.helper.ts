import os from 'node:os';
import { StackHelper } from './stack.helper';

type SignalType = NodeJS.Signals;
type ProcessMethodType = 'unhandledRejection' | 'uncaughtException' | 'signal' | 'exit';
type ProcessEventType = Exclude<ProcessMethodType, 'signal'> | SignalType;
type ProcessShutdownHandlerType = (signal: SignalType) => void | Promise<void>;
type ProcessHandlerByEventType = {
  unhandledRejection: (reason: unknown) => void | Promise<void>;
  uncaughtException: (error: Error) => void | Promise<void>;
  exit: (code: number) => void;
} & Record<SignalType, () => void | Promise<void>>;
type ProcessHandlerType = ProcessHandlerByEventType[ProcessEventType];
type ProcessHandlerEntryType = {
  [Event in ProcessEventType]: [Event, ProcessHandlerByEventType[Event]];
}[ProcessEventType];
type ProcessLogLevelType = 'log' | 'warn' | 'error' | 'debug';
type ProcessWriteMetadataMethodType = (
  level: 'LOG' | 'WRN' | 'ERR' | 'DBG',
  metadata: { callerOverride: string; methodOverride: string },
  ...message: unknown[]
) => void;

export interface ProcessConfigInterface {
  exitSignals?: SignalType[];
  logOnlySignals?: SignalType[];
  shutdownHandler?: ProcessShutdownHandlerType;
  handleErrors?: boolean;
  handleExit?: boolean;
  exitOnSignal?: boolean;
  exitCode?: number;
  exitOnUncaughtException?: boolean;
  exitOnUnhandledRejection?: boolean;
  errorExitCode?: number;
  signalLogLevel?: ProcessLogLevelType;
  maxListeners?: number;
  customHandlers?: ProcessHandlerEntryType[];
}

type ProcessResolvedConfigType = {
  exitSignals: SignalType[];
  logOnlySignals: SignalType[];
  shutdownHandler?: ProcessShutdownHandlerType;
  handleErrors: boolean;
  handleExit: boolean;
  exitOnSignal: boolean;
  exitCode: number;
  exitOnUncaughtException: boolean;
  exitOnUnhandledRejection: boolean;
  errorExitCode: number;
  signalLogLevel: ProcessLogLevelType;
  maxListeners: number;
  customHandlers: ProcessHandlerEntryType[];
};

export interface ProcessLoggerInterface {
  writeWithMetadata?: ProcessWriteMetadataMethodType;
  errorWithStack?: (stack: string | undefined, message?: unknown, ...params: unknown[]) => void;

  log(...message: unknown[]): void;

  error(...message: unknown[]): void;

  warn(...message: unknown[]): void;

  debug(...message: unknown[]): void;
}

const processLogLevelMap: Record<ProcessLogLevelType, 'LOG' | 'WRN' | 'ERR' | 'DBG'> = {
  log: 'LOG',
  warn: 'WRN',
  error: 'ERR',
  debug: 'DBG',
};

const processSignalByExitCodeMap = new Map<number, NodeJS.Signals>();
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
  processSignalByExitCodeMap.set(128 + os.constants.signals[signal], signal);
}

const processHelperCaller = 'ProcessHelper';

const defaultProcessConfig: ProcessResolvedConfigType = {
  exitSignals: ['SIGTERM', 'SIGINT'],
  logOnlySignals: ['SIGHUP', 'SIGUSR2'],
  shutdownHandler: undefined,
  handleErrors: true,
  handleExit: true,
  exitOnSignal: false,
  exitCode: 0,
  exitOnUncaughtException: false,
  exitOnUnhandledRejection: false,
  errorExitCode: 1,
  signalLogLevel: 'warn',
  maxListeners: 10,
  customHandlers: [],
};

class ProcessHelperClass {
  private isHooked = false;
  private shutdownPromise: Promise<void> | null = null;
  private readonly handlerMap = new Map<ProcessEventType, ProcessHandlerType[]>();

  public hook(logger: ProcessLoggerInterface, config: ProcessConfigInterface = {}): void {
    if (this.isHooked) {
      return;
    }

    const normalizedConfig = this.normalizeConfig(config);
    process.setMaxListeners(normalizedConfig.maxListeners);

    for (const [event, handler] of this.buildHandlers(logger, normalizedConfig)) {
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

    return {
      ...defaultProcessConfig,
      ...config,
      exitSignals,
      logOnlySignals,
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

  private buildHandlers(logger: ProcessLoggerInterface, config: ProcessResolvedConfigType): ProcessHandlerEntryType[] {
    const handlerList: ProcessHandlerEntryType[] = [...config.customHandlers];

    if (config.handleErrors) {
      handlerList.push(
        this.createHandlerEntry(
          'unhandledRejection',
          async (reason: unknown): Promise<void> =>
            this.handleEvent(
              logger,
              'error',
              'unhandledRejection',
              reason,
              config.exitOnUnhandledRejection,
              config.errorExitCode,
            ),
        ),
      );
      handlerList.push(
        this.createHandlerEntry(
          'uncaughtException',
          async (error: Error): Promise<void> =>
            this.handleEvent(
              logger,
              'error',
              'uncaughtException',
              error,
              config.exitOnUncaughtException,
              config.errorExitCode,
            ),
        ),
      );
    }

    for (const signal of config.exitSignals) {
      handlerList.push(
        this.createHandlerEntry(
          signal,
          async (): Promise<void> =>
            this.handleEvent(
              logger,
              config.signalLogLevel,
              'signal',
              signal,
              config.exitOnSignal,
              config.exitCode,
              config.shutdownHandler,
            ),
        ),
      );
    }

    for (const signal of config.logOnlySignals) {
      handlerList.push(
        this.createHandlerEntry(
          signal,
          async (): Promise<void> => this.handleEvent(logger, config.signalLogLevel, 'signal', signal),
        ),
      );
    }

    if (config.handleExit) {
      handlerList.push(
        this.createHandlerEntry(
          'exit',
          async (code: number): Promise<void> => this.handleEvent(logger, 'debug', 'exit', code),
        ),
      );
    }

    return handlerList;
  }

  private async handleEvent(
    logger: ProcessLoggerInterface,
    level: ProcessLogLevelType,
    method: ProcessMethodType,
    payload: unknown,
    shouldExit = false,
    exitCode = 0,
    shutdownHandler?: ProcessShutdownHandlerType,
  ): Promise<void> {
    try {
      this.log(logger, level, method, payload);
    } catch {
      // no-op
    }

    if (shouldExit) {
      if (method === 'signal' && typeof payload === 'string') {
        await this.runShutdownHandler(payload as SignalType, shutdownHandler);
      }
      process.exit(exitCode);
    }
  }

  private async runShutdownHandler(signal: SignalType, shutdownHandler?: ProcessShutdownHandlerType): Promise<void> {
    if (!shutdownHandler) {
      return;
    }
    this.shutdownPromise ??= Promise.resolve(shutdownHandler(signal)).finally(() => {
      this.shutdownPromise = null;
    });
    await this.shutdownPromise;
  }

  private log(
    logger: ProcessLoggerInterface,
    level: ProcessLogLevelType,
    method: ProcessMethodType,
    payload: unknown,
  ): void {
    if (level === 'error' && payload instanceof Error) {
      const stack = this.buildProcessStack(method, payload);

      if (logger.errorWithStack) {
        logger.errorWithStack(stack, payload);
        return;
      }

      logger.error(payload, stack, processHelperCaller);
      return;
    }

    const message =
      method === 'signal' ? [String(payload)] : method === 'exit' ? [this.describeExitCode(payload)] : [payload];

    if (logger.writeWithMetadata) {
      logger.writeWithMetadata(
        processLogLevelMap[level],
        { callerOverride: processHelperCaller, methodOverride: method },
        ...message,
      );
      return;
    }

    switch (level) {
      case 'log':
        logger.log(...message);
        return;
      case 'warn':
        logger.warn(...message);
        return;
      case 'error':
        logger.error(...message);
        return;
      case 'debug':
        logger.debug(...message);
    }
  }

  private buildProcessStack(method: string, error: Error): string | undefined {
    if (!error.stack) {
      return undefined;
    }

    const origin = StackHelper.resolveOrigin(StackHelper.toTrace(error.stack), 0);
    const location = origin.frame ? StackHelper.formatFrameLocation(origin.frame) : undefined;
    if (!location) {
      return error.stack;
    }

    const [header, ...rest] = error.stack.split('\n');
    return [
      header || error.name || 'Error',
      `    at ${processHelperCaller}.${method} (${location})`,
      ...rest.slice(1),
    ].join('\n');
  }

  private describeExitCode(payload: unknown): string {
    if (typeof payload !== 'number') {
      return `Exited with unknown code: ${String(payload)}`;
    }
    const signal = processSignalByExitCodeMap.get(payload);

    switch (payload) {
      case 0:
        return 'Success';
      case 1:
        return 'General error';
      default:
        return signal ?? payload.toString();
    }
  }
}

export const ProcessHelper = new ProcessHelperClass();
