import { LoggerService } from '@nestjs/common';
import { LoggerSystemOptionsInterface } from '../classes/logger-system.class';
import {
  LoggerNestClass,
  LoggerNestInterface,
  LoggerNestLevelType,
  LoggerNestMetadataInterface,
} from './logger-nest.class';

export class NestLoggerSystemAbstract implements LoggerService {
  private readonly logger: LoggerNestInterface;

  public constructor(options: LoggerSystemOptionsInterface) {
    this.logger = new LoggerNestClass(options);
  }

  private get traceMetadata(): LoggerNestMetadataInterface {
    const { caller, file } = this.logger.metadata(new Error().stack, 2);
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
    if (this.logger.stdout) {
      this.logger.stdout(level, metadata, [message, ...params], caller, 'system');
      return;
    }
    this.outputByLevel(level, message, ...params, caller);
  }

  private outputByLevel(level: LoggerNestLevelType, ...data: unknown[]): void {
    switch (level) {
      case 'INF':
        this.logger.info(...data);
        break;
      case 'WRN':
        this.logger.warn(...data);
        break;
      case 'ERR':
      case 'FTL':
        this.logger.error(...data);
        break;
      case 'DBG':
        this.logger.debug(...data);
        break;
      default:
        this.logger.log(...data);
        break;
    }
  }
}
