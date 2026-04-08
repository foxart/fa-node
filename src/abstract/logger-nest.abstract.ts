import { LoggerService } from '@nestjs/common/services/logger.service';
import { LoggerNestClass } from '../classes/logger-nest.class';
import { LoggerLevelType, LoggerMetadataInterface, LoggerOptionsInterface } from '../classes/logger.class';
// interface LoggerNestInterface {
//   log(message: unknown, ...optionalParams: unknown[]): unknown;
//   error(message: unknown, ...optionalParams: unknown[]): unknown;
//   warn(message: unknown, ...optionalParams: unknown[]): unknown;
//   debug?(message: unknown, ...optionalParams: unknown[]): unknown;
//   verbose?(message: unknown, ...optionalParams: unknown[]): unknown;
//   fatal?(message: unknown, ...optionalParams: unknown[]): unknown;
//   setLogLevels?(levels: LogLevel[]): unknown;
// }

export class LoggerNestAbstract implements LoggerService {
  private static readonly LOGGER_METHOD_SET = new Set(['log', 'error', 'warn', 'debug', 'verbose', 'fatal']);
  private readonly logger: LoggerNestClass;

  public constructor(options: LoggerOptionsInterface) {
    this.logger = new LoggerNestClass(options);
  }

  protected get metadata(): LoggerMetadataInterface {
    return this.logger.resolveMetadata(new Error().stack, 2);
  }

  public log(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('LOG', this.metadata, context, message, ...params);
  }

  public error(message: unknown, ...params: unknown[]): void {
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
    const isErrorMessageDuplicatedInStack = typeof message === 'string' && stack?.includes(message);
    if (!isErrorMessageDuplicatedInStack) {
      outputMessages.push(message);
    }
    if (stack) {
      outputMessages.push(stack);
    }
    for (const param of params) {
      outputMessages.push(param);
    }
    const [firstMessage, ...restMessages] = outputMessages.length > 0 ? outputMessages : [undefined];
    if (firstMessage !== undefined) {
      this.stdout('ERR', this.metadata, caller, firstMessage, ...restMessages);
    }
  }

  public warn(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('WRN', this.metadata, context, message, ...params);
  }

  public debug(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('DBG', this.metadata, context, message, ...params);
  }

  public verbose(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('INF', this.metadata, context, message, ...params);
  }

  public fatal(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('FTL', this.metadata, context, message, ...params);
  }

  protected stdout(
    level: LoggerLevelType,
    metadata: LoggerMetadataInterface,
    context: string | undefined,
    message: unknown,
    ...params: unknown[]
  ): void {
    if (message === 'Nest application successfully started') {
      return;
    }
    const caller = context ? context : this.logger.resolveCaller(metadata);
    const safeMetadata = {
      ...metadata,
      method: this.resolveMethod(metadata.method),
    };
    this.logger.print(level, safeMetadata, [message, ...params], caller);
  }

  private resolveMethod(method: string | undefined): string | undefined {
    const result = this.logger.resolveMethod(method);
    return result && LoggerNestAbstract.LOGGER_METHOD_SET.has(result) ? undefined : result;
  }
}
