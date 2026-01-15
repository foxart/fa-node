import { LoggerService } from '@nestjs/common';
import type {
  LoggerNestFormatterInterface,
  LoggerNestMetadataInterface,
  LoggerNestOptionsInterface,
  LoggerNestOutputterInterface,
} from './logger-nest.class';
import { LoggerNestClass, LoggerNestLevelType } from './logger-nest.class';

export class NestLoggerSystemAbstract implements LoggerService {
  private readonly outputter: LoggerNestFormatterInterface | LoggerNestOutputterInterface;

  public constructor(
    options: LoggerNestOptionsInterface,
    outputter?: LoggerNestFormatterInterface | LoggerNestOutputterInterface,
  ) {
    this.outputter = outputter ?? new LoggerNestClass(options);
  }

  private get traceMetadata(): LoggerNestMetadataInterface {
    if (this.isFormatter(this.outputter)) {
      const { caller, file } = this.outputter.metadata(new Error().stack, 2);
      return { caller, file, method: undefined };
    }
    const { caller, file } = this.fallbackMetadata(new Error().stack, 2);
    return { caller, file, method: undefined };
  }

  public log(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('LOG', this.traceMetadata, context, message, ...params);
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
      if (param instanceof Error) {
        outputMessages.push(param.message);
        if (param.stack) {
          outputMessages.push(param.stack);
        }
      } else {
        outputMessages.push(param);
      }
    }
    const [firstMessage, ...restMessages] = outputMessages.length > 0 ? outputMessages : [undefined];
    if (firstMessage !== undefined) {
      this.write('ERR', this.traceMetadata, caller, firstMessage, ...restMessages);
    }
  }

  public warn(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('WRN', this.traceMetadata, context, message, ...params);
  }

  public debug(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('DBG', this.traceMetadata, context, message, ...params);
  }

  public verbose(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('INF', this.traceMetadata, context, message, ...params);
  }

  public fatal(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('FTL', this.traceMetadata, context, message, ...params);
  }

  protected write(
    level: LoggerNestLevelType,
    metadata: LoggerNestMetadataInterface,
    context: string | undefined,
    message: unknown,
    ...params: unknown[]
  ): void {
    if (message === 'Nest application successfully started') {
      return;
    }
    const caller = context ? context : metadata.caller;
    if (this.isFormatter(this.outputter)) {
      this.outputter.stdout(level, metadata, [message, ...params], caller, 'system');
      return;
    }
    this.outputByLevel(level, message, ...params, caller);
  }

  private outputByLevel(level: LoggerNestLevelType, ...data: unknown[]): void {
    if (this.isFormatter(this.outputter)) {
      return;
    }
    const outputter = this.outputter;
    switch (level) {
      case 'INF':
        outputter.info(...data);
        break;
      case 'WRN':
        outputter.warn(...data);
        break;
      case 'ERR':
      case 'FTL':
        if (outputter.fatal && level === 'FTL') {
          outputter.fatal(...data);
        } else {
          outputter.error(...data);
        }
        break;
      case 'DBG':
        outputter.debug(...data);
        break;
      default:
        outputter.log(...data);
        break;
    }
  }

  private isFormatter(
    outputter: LoggerNestFormatterInterface | LoggerNestOutputterInterface,
  ): outputter is LoggerNestFormatterInterface {
    return (
      typeof (outputter as LoggerNestFormatterInterface).format === 'function' &&
      typeof (outputter as LoggerNestFormatterInterface).metadata === 'function' &&
      typeof (outputter as LoggerNestFormatterInterface).stdout === 'function'
    );
  }

  private fallbackMetadata(stack = '', level: number): LoggerNestMetadataInterface {
    const trace = stack.split('\n');
    const line = trace[level] ?? '';
    const cleaned = line.trim().replace('at ', '');
    const fileMatch = cleaned.match(/\((.*\.ts:\d+:\d+)\)/) || cleaned.match(/(.*\.ts:\d+:\d+)/);
    const file = fileMatch ? fileMatch[1] : 'unknown';
    const callerMatch = cleaned.match(/([^/\\]+\.ts:\d+:\d+)/);
    const caller = callerMatch ? callerMatch[1] : 'unknown';
    return { caller, file, method: undefined };
  }
}
