import { LoggerService } from '@nestjs/common';
import {
  LoggerNestClass,
  LoggerNestLevelType,
  LoggerNestMetadataInterface,
  LoggerNestOptionsInterface,
} from '../classes/logger-nest.class';

export class LoggerSystemAbstract implements LoggerService {
  private readonly logger: LoggerNestClass;

  public constructor(options: LoggerNestOptionsInterface) {
    this.logger = new LoggerNestClass(options);
  }

  protected get metadata(): LoggerNestMetadataInterface {
    return this.logger.resolveMetadata(new Error().stack, 2);
  }

  public log(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
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
      this.stdout('ERR', this.metadata, caller, firstMessage, ...restMessages);
    }
  }

  public warn(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('WRN', this.metadata, context, message, ...params);
  }

  public debug(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('DBG', this.metadata, context, message, ...params);
  }

  public verbose(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('INF', this.metadata, context, message, ...params);
  }

  public fatal(message: unknown, ...params: [...unknown[]] | [...unknown[], string]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.stdout('FTL', this.metadata, context, message, ...params);
  }

  protected stdout(
    level: LoggerNestLevelType,
    metadata: LoggerNestMetadataInterface,
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
      method: metadata.method
        ? ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'].includes(metadata.method)
          ? undefined
          : metadata.method
        : undefined,
    };
    this.logger.print(level, safeMetadata, [message, ...params], caller);
  }
}
