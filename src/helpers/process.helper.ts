import os from 'node:os';

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
type ProcessWriteMetadataMethodType = (
  level: 'LOG' | 'WRN' | 'ERR' | 'DBG',
  metadata: { callerOverride: string; methodOverride: string },
  ...message: unknown[]
) => void;

export interface ProcessConfigInterface {
  exitSignals?: SignalType[];
  logOnlySignals?: SignalType[];
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

const processSignalByExitCodeMap = new Map<number, SignalType>();
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

const defaultProcessConfig: ProcessResolvedConfigType = {
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

class ProcessHelperClass {
  private isHooked = false;
  private readonly handlerMap = new Map<ProcessEventType, ProcessHandlerType[]>();

  public register(logger: ProcessLoggerInterface, config: ProcessConfigInterface = {}): void {
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

  public hook(logger: ProcessLoggerInterface, config: ProcessConfigInterface = {}): void {
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

  private normalizeConfig(config: ProcessConfigInterface): ProcessResolvedConfigType {
    const normalizedConfig: ProcessResolvedConfigType = {
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

  private buildHandlers(logger: ProcessLoggerInterface, config: ProcessResolvedConfigType): ProcessHandlerEntryType[] {
    const handlerList: ProcessHandlerEntryType[] = [];
    const addHandler = (event: ProcessEventType, handler: ProcessHandlerType): void => {
      handlerList.push([event, handler]);
    };

    if (config.handleErrors) {
      addHandler('unhandledRejection', (reason: ProcessRejectionReasonType) => {
        try {
          this.logWithMetadata(logger, 'error', 'unhandledRejection', reason);
        } catch {
          // no-op
        }
        if (config.exitOnUnhandledRejection) {
          process.exit(config.errorExitCode);
        }
      });

      addHandler('uncaughtException', (error: ProcessErrorType) => {
        try {
          this.logWithMetadata(logger, 'error', 'uncaughtException', error);
        } catch {
          // no-op
        }
        if (config.exitOnUncaughtException) {
          process.exit(config.errorExitCode);
        }
      });
    }

    for (const signal of config.exitSignals) {
      addHandler(signal, () => {
        try {
          this.logWithMetadata(logger, config.signalLogLevel, 'signal', signal);
        } catch {
          // no-op
        }
        if (config.exitOnSignal) {
          process.exit(config.exitCode);
        }
      });
    }

    for (const signal of config.logOnlySignals) {
      addHandler(signal, () => {
        try {
          this.logWithMetadata(logger, config.signalLogLevel, 'signal', signal);
        } catch {
          // no-op
        }
      });
    }

    if (config.handleExit) {
      addHandler('exit', (code: ProcessExitCodeType) => {
        try {
          this.logWithMetadata(logger, 'debug', 'exit', code);
        } catch {
          // no-op
        }
      });
    }

    for (const [event, handler] of config.customHandlers) {
      addHandler(event, handler);
    }

    return handlerList;
  }

  private logWithMetadata(
    logger: ProcessLoggerInterface,
    level: ProcessLogLevelType,
    method: string,
    payload: unknown,
  ): void {
    const message = this.buildMessage(method, payload);

    if (logger.writeWithMetadata) {
      logger.writeWithMetadata(
        processLogLevelMap[level],
        { callerOverride: 'ProcessHelper', methodOverride: method },
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

  private buildMessage(method: string, payload: unknown): unknown[] {
    switch (method) {
      case 'unhandledRejection':
        return [payload];
      case 'uncaughtException':
        return [payload];
      case 'signal':
        return [String(payload)];
      case 'exit':
        return [this.describeExitCode(payload)];
      default:
        return [payload];
    }
  }

  private describeExitCode(payload: unknown): string {
    if (typeof payload !== 'number') {
      return `Exited with unknown code: ${String(payload)}`;
    }

    switch (payload) {
      case 0:
        return 'Success';
      case 1:
        return 'General error';
      default:
        return processSignalByExitCodeMap.has(payload)
          ? String(processSignalByExitCodeMap.get(payload))
          : payload.toString();
    }
  }
}

export const ProcessHelper = new ProcessHelperClass();
