import { LoggerService } from '@nestjs/common';
import type {
  NestLoggerInterface,
  NestLoggerMetadataInterface,
  NestLoggerOptionsInterface,
} from './nest-logger.abstract';
import { NestLoggerAbstract, NestLoggerLevelType } from './nest-logger.abstract';

export class NestLoggerApplicationAbstract extends NestLoggerAbstract implements LoggerService {
  public constructor(options: NestLoggerOptionsInterface, outputter?: NestLoggerInterface) {
    super(options, outputter);
  }

  private get traceMetadata(): NestLoggerMetadataInterface {
    return this.metadata(new Error().stack, 2);
  }

  public log(message: unknown, ...args: unknown[]): void {
    this.write('LOG', this.traceMetadata, message, ...args);
  }

  public error(...args: unknown[]): void {
    this.write('ERR', this.traceMetadata, ...args);
  }

  public warn(message: unknown, ...args: unknown[]): void {
    this.write('WRN', this.traceMetadata, message, ...args);
  }

  public debug(message: unknown, ...args: unknown[]): void {
    this.write('DBG', this.traceMetadata, message, ...args);
  }

  public info(message: unknown, ...args: unknown[]): void {
    this.write('INF', this.traceMetadata, message, ...args);
  }

  protected write(level: NestLoggerLevelType, metadata: NestLoggerMetadataInterface, ...params: unknown[]): void {
    this.stdout(level, metadata, params, undefined, 'application');
  }
}
