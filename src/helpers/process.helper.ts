type Signal = NodeJS.Signals;

type ProcessEvent = 'unhandledRejection' | 'uncaughtException' | 'exit' | Signal;

type Handler = (...args: unknown[]) => void;

interface LoggerLike {
  log(...message: unknown[]): void;
  error(...message: unknown[]): void;
  warn(...message: unknown[]): void;
  debug(...message: unknown[]): void;
}

function buildHandlers(logger: LoggerLike, config: ProcessConfigInterface): Array<[ProcessEvent, Handler]> {
  const handlers: Array<[ProcessEvent, Handler]> = [];
  const add = (event: ProcessEvent, handler: Handler): void => {
    handlers.push([event, handler]);
  };
  if (config.handleErrors) {
    add('unhandledRejection', (reason) => {
      logger.error('UnhandledRejection', reason);
    });
    add('uncaughtException', (error: unknown) => {
      logger.error('UncaughtException', error);
    });
  }
  config.exitSignals.forEach((signal) => {
    add(signal, () => {
      logger.warn('Received: ', String(signal));
      process.exit(0);
    });
  });
  config.logOnlySignals.forEach((signal) => {
    add(signal, () => {
      logger.log('Received:', String(signal));
    });
  });
  if (config.handleExit) {
    add('exit', (code: unknown) => {
      logger.debug('Process exit with code:', code);
    });
  }
  return handlers;
}

export interface ProcessConfigInterface {
  exitSignals: Signal[];
  logOnlySignals: Signal[];
  handleErrors: boolean;
  handleExit: boolean;
}

export function hookToProcess(logger: LoggerLike, config: ProcessConfigInterface): void {
  buildHandlers(logger, config).forEach(([event, handler]) => {
    process.on(event, handler);
  });
}
