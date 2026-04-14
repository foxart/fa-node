type SignalType = NodeJS.Signals;
type ProcessEventType = 'unhandledRejection' | 'uncaughtException' | 'exit' | SignalType;
type ProcessHandlerType = (...args: unknown[]) => void;
type ProcessHandlerEntryType = [ProcessEventType, ProcessHandlerType];

export interface ProcessConfigInterface {
  exitSignals: SignalType[];
  logOnlySignals: SignalType[];
  handleErrors: boolean;
  handleExit: boolean;
}

interface ProcessLoggerInterface {
  log(...message: unknown[]): void;
  error(...message: unknown[]): void;
  warn(...message: unknown[]): void;
  debug(...message: unknown[]): void;
}

class ProcessSingleton {
  private static self: ProcessSingleton;

  public static getInstance(): ProcessSingleton {
    if (!ProcessSingleton.self) {
      ProcessSingleton.self = new ProcessSingleton();
    }
    return ProcessSingleton.self;
  }

  public hook(logger: ProcessLoggerInterface, config: ProcessConfigInterface): void {
    for (const [event, handler] of this.buildHandlers(logger, config)) {
      process.on(event, handler);
    }
  }

  private buildHandlers(logger: ProcessLoggerInterface, config: ProcessConfigInterface): ProcessHandlerEntryType[] {
    const handlerList: ProcessHandlerEntryType[] = [];
    const addHandler = (event: ProcessEventType, handler: ProcessHandlerType): void => {
      handlerList.push([event, handler]);
    };

    if (config.handleErrors) {
      addHandler('unhandledRejection', (reason) => {
        logger.error('UnhandledRejection', reason);
      });
      addHandler('uncaughtException', (error: unknown) => {
        logger.error('UncaughtException', error);
      });
    }

    for (const signal of config.exitSignals) {
      addHandler(signal, () => {
        logger.warn('Received:', String(signal));
        process.exit(0);
      });
    }

    for (const signal of config.logOnlySignals) {
      addHandler(signal, () => {
        logger.log('Received:', String(signal));
      });
    }

    if (config.handleExit) {
      addHandler('exit', (code: unknown) => {
        logger.debug('Process exit with code:', code);
      });
    }

    return handlerList;
  }
}

export const ProcessHelper = ProcessSingleton.getInstance();
