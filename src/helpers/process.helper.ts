import os from 'node:os';
import { StackHelper } from './stack.helper';

type ProcessEventType = 'unhandledRejection' | 'uncaughtException' | 'exit' | NodeJS.Signals;
type ProcessHandlerType = ((code: number) => void) | ((reason: unknown) => void) | (() => void);
type ProcessHandlerEntryType = [ProcessEventType, ProcessHandlerType];
type ProcessLogLevelType = 'log' | 'warn' | 'error' | 'debug';
type ProcessWriteMetadataMethodType = (
  level: 'LOG' | 'WRN' | 'ERR' | 'DBG',
  metadata: { callerOverride: string; methodOverride: string },
  ...message: unknown[]
) => void;

export interface ProcessConfigInterface {
  exitSignals?: NodeJS.Signals[];
  logOnlySignals?: NodeJS.Signals[];
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
  exitSignals: NodeJS.Signals[];
  logOnlySignals: NodeJS.Signals[];
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
    const handlerList: ProcessHandlerEntryType[] = [...config.customHandlers];

    if (config.handleErrors) {
      handlerList.push([
        'unhandledRejection',
        (reason: unknown): void =>
          this.handleEvent(
            logger,
            'error',
            'unhandledRejection',
            reason,
            config.exitOnUnhandledRejection,
            config.errorExitCode,
          ),
      ]);
      handlerList.push([
        'uncaughtException',
        (error: Error): void =>
          this.handleEvent(
            logger,
            'error',
            'uncaughtException',
            error,
            config.exitOnUncaughtException,
            config.errorExitCode,
          ),
      ]);
    }

    for (const signal of config.exitSignals) {
      handlerList.push([
        signal,
        (): void =>
          this.handleEvent(logger, config.signalLogLevel, 'signal', signal, config.exitOnSignal, config.exitCode),
      ]);
    }

    for (const signal of config.logOnlySignals) {
      handlerList.push([signal, (): void => this.handleEvent(logger, config.signalLogLevel, 'signal', signal)]);
    }

    if (config.handleExit) {
      handlerList.push(['exit', (code: number): void => this.handleEvent(logger, 'debug', 'exit', code)]);
    }

    return handlerList;
  }

  private handleEvent(
    logger: ProcessLoggerInterface,
    level: ProcessLogLevelType,
    method: 'unhandledRejection' | 'uncaughtException' | 'signal' | 'exit',
    payload: unknown,
    shouldExit = false,
    exitCode = 0,
  ): void {
    try {
      this.log(logger, level, method, payload);
    } catch {
      // no-op
    }

    if (shouldExit) {
      process.exit(exitCode);
    }
  }

  private log(
    logger: ProcessLoggerInterface,
    level: ProcessLogLevelType,
    method: 'unhandledRejection' | 'uncaughtException' | 'signal' | 'exit',
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
