import { LoggerNestClass } from '../classes/logger-nest.class';
import {
  LoggerLevelType,
  LoggerMetadataOutputOptionsInterface,
  LoggerOptionsInterface,
  LoggerOriginInterface,
} from '../classes/logger.class';

type LogLevel = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];

interface LoggerNestInterface {
  log(message: unknown, ...optionalParams: unknown[]): unknown;
  error(message: unknown, ...optionalParams: unknown[]): unknown;
  warn(message: unknown, ...optionalParams: unknown[]): unknown;
  debug?(message: unknown, ...optionalParams: unknown[]): unknown;
  verbose?(message: unknown, ...optionalParams: unknown[]): unknown;
  fatal?(message: unknown, ...optionalParams: unknown[]): unknown;
  setLogLevels?(levels: LogLevel[]): unknown;
}

export class LoggerNestAbstract implements LoggerNestInterface {
  private static readonly LOGGER_METHOD_SET = new Set(['log', 'error', 'warn', 'debug', 'verbose', 'fatal']);
  private static readonly LOGGER_METADATA_OPTIONS: LoggerMetadataOutputOptionsInterface = {
    hideMethodSet: LoggerNestAbstract.LOGGER_METHOD_SET,
  };
  private readonly logger: LoggerNestClass;

  public constructor(options: LoggerOptionsInterface) {
    this.logger = new LoggerNestClass(options);
  }

  protected get origin(): LoggerOriginInterface {
    return this.logger.resolveOrigin(new Error().stack, 2);
  }

  public log(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('LOG', this.origin, context, message, ...params);
  }

  public error(message: unknown, ...params: unknown[]): void {
    const origin = this.origin;
    let context: string | undefined;
    let stack: string | undefined;
    if (params.length > 0 && typeof params[0] === 'string' && /\n\s*at\s+/m.test(params[0])) {
      stack = params.shift() as string;
    }
    if (params.length > 0 && typeof params[params.length - 1] === 'string') {
      context = params.pop() as string;
    }
    const caller = context ?? '';
    const outputMessages: unknown[] = [];
    if (stack && typeof message === 'string') {
      const match = message.match(/^([^:]+):\s*(.*)$/);
      outputMessages.push({
        name: match?.[1] || 'Error',
        message: match?.[2] || message,
        stack,
      });
    } else if (message !== undefined) {
      outputMessages.push(message);
    }
    for (const param of params) {
      outputMessages.push(param);
    }
    const [firstMessage, ...restMessages] = outputMessages.length > 0 ? outputMessages : [undefined];
    if (firstMessage !== undefined) {
      this.stdout('ERR', stack ? this.logger.resolveOrigin(stack, 0) : origin, caller, firstMessage, ...restMessages);
    }
  }

  public warn(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('WRN', this.origin, context, message, ...params);
  }

  public debug(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('DBG', this.origin, context, message, ...params);
  }

  public verbose(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('INF', this.origin, context, message, ...params);
  }

  public fatal(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('FTL', this.origin, context, message, ...params);
  }

  protected stdout(
    level: LoggerLevelType,
    origin: LoggerOriginInterface,
    context: string | undefined,
    message: unknown,
    ...params: unknown[]
  ): void {
    if (message === 'Nest application successfully started') {
      return;
    }
    this.logger.print(level, origin, [message, ...params], {
      ...LoggerNestAbstract.LOGGER_METADATA_OPTIONS,
      callerOverride: context,
    });
  }
}
