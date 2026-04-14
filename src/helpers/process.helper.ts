type SignalType = NodeJS.Signals;
type ProcessEventType = 'unhandledRejection' | 'uncaughtException' | 'exit' | SignalType;
type ProcessExitCodeType = number;
type ProcessErrorType = Error;
type ProcessRejectionReasonType = unknown;
type ProcessSignalHandlerType = () => void;
type ProcessExitHandlerType = (code: ProcessExitCodeType) => void;
type ProcessUnhandledRejectionHandlerType = (reason: ProcessRejectionReasonType) => void;
type ProcessUncaughtExceptionHandlerType = (error: ProcessErrorType) => void;
type ProcessHandlerType =
  | ProcessSignalHandlerType
  | ProcessExitHandlerType
  | ProcessUnhandledRejectionHandlerType
  | ProcessUncaughtExceptionHandlerType;
type ProcessHandlerEntryType = [ProcessEventType, ProcessHandlerType];
type ProcessLogLevelType = 'log' | 'warn' | 'error' | 'debug';

export interface ProcessLoggerInterface {
  log(...message: unknown[]): void;
  error(...message: unknown[]): void;
  warn(...message: unknown[]): void;
  debug(...message: unknown[]): void;
}

export interface ProcessConfigInterface {
  exitSignals: SignalType[];
  logOnlySignals: SignalType[];
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
}

const processLoggerMethodMap: Record<ProcessLogLevelType, keyof ProcessLoggerInterface> = {
  log: 'log',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

const defaultProcessConfig: ProcessConfigInterface = {
  exitSignals: ['SIGTERM', 'SIGINT'],
  logOnlySignals: ['SIGHUP'],
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

class ProcessSingleton {
  private static self: ProcessSingleton;

  private isHooked = false;
  private readonly handlerMap = new Map<ProcessEventType, ProcessHandlerType[]>();

  public static getInstance(): ProcessSingleton {
    if (!ProcessSingleton.self) {
      ProcessSingleton.self = new ProcessSingleton();
    }
    return ProcessSingleton.self;
  }

  public register(logger: ProcessLoggerInterface, config: Partial<ProcessConfigInterface> = {}): void {
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

  public hook(logger: ProcessLoggerInterface, config: Partial<ProcessConfigInterface> = {}): void {
    this.register(logger, config);
  }

  public unhook(): void {
    for (const [event, handlers] of this.handlerMap.entries()) {
      for (const handler of handlers) {
        process.off(event, handler);
      }
    }

    this.handlerMap.clear();
    this.isHooked = false;
  }

  private normalizeConfig(config: Partial<ProcessConfigInterface>): ProcessConfigInterface {
    const normalizedConfig: ProcessConfigInterface = {
      ...defaultProcessConfig,
      ...config,
      exitSignals: config.exitSignals ?? defaultProcessConfig.exitSignals,
      logOnlySignals: config.logOnlySignals ?? defaultProcessConfig.logOnlySignals,
      customHandlers: config.customHandlers ?? defaultProcessConfig.customHandlers,
    };

    const exitSignals = new Set(normalizedConfig.exitSignals);
    normalizedConfig.logOnlySignals = normalizedConfig.logOnlySignals.filter((signal) => !exitSignals.has(signal));

    return normalizedConfig;
  }

  private addHandler(event: ProcessEventType, handler: ProcessHandlerType): void {
    const handlerList = this.handlerMap.get(event) ?? [];
    handlerList.push(handler);
    this.handlerMap.set(event, handlerList);
  }

  private buildHandlers(logger: ProcessLoggerInterface, config: ProcessConfigInterface): ProcessHandlerEntryType[] {
    const handlerList: ProcessHandlerEntryType[] = [];
    const addHandler = (event: ProcessEventType, handler: ProcessHandlerType): void => {
      handlerList.push([event, handler]);
    };

    if (config.handleErrors) {
      addHandler('unhandledRejection', (reason: ProcessRejectionReasonType) => {
        this.safeLog(logger, 'error', 'Process unhandled rejection:', reason);
        if (config.exitOnUnhandledRejection) {
          process.exit(config.errorExitCode);
        }
      });

      addHandler('uncaughtException', (error: ProcessErrorType) => {
        this.safeLog(logger, 'error', 'Process uncaught exception:', error);
        if (config.exitOnUncaughtException) {
          process.exit(config.errorExitCode);
        }
      });
    }

    for (const signal of config.exitSignals) {
      addHandler(signal, () => {
        this.safeLog(logger, config.signalLogLevel, `Process received signal: ${signal}`);
        if (config.exitOnSignal) {
          process.exit(config.exitCode);
        }
      });
    }

    for (const signal of config.logOnlySignals) {
      addHandler(signal, () => {
        this.safeLog(logger, config.signalLogLevel, `Process received signal: ${signal}`);
      });
    }

    if (config.handleExit) {
      addHandler('exit', (code: ProcessExitCodeType) => {
        this.safeLog(logger, 'debug', 'Process exited with code:', code);
      });
    }

    for (const [event, handler] of config.customHandlers) {
      addHandler(event, handler);
    }

    return handlerList;
  }

  private safeLog(logger: ProcessLoggerInterface, level: ProcessLogLevelType, ...message: unknown[]): void {
    try {
      logger[processLoggerMethodMap[level]](...message);
    } catch {
      // no-op
    }
  }
}

export const ProcessHelper = ProcessSingleton.getInstance();
//
