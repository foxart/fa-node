import { LoggerService } from '@nestjs/common';
import type { LoggerMetadataInterface, NestLoggerOptionsInterface } from './nest-logger.abstract';
import { NestLoggerAbstract, NestLoggerLevelType } from './nest-logger.abstract';

export class NestLoggerApplicationAbstract extends NestLoggerAbstract implements LoggerService {
  public constructor(options: NestLoggerOptionsInterface) {
    super(options);
  }

  private get traceMetadata(): LoggerMetadataInterface {
    return this.metadata(new Error().stack, 2);
  }

  public override log(message: unknown, ...args: unknown[]): void {
    this.write('LOG', this.traceMetadata, message, ...args);
  }

  public override info(message: unknown, ...args: unknown[]): void {
    this.write('INF', this.traceMetadata, message, ...args);
  }

  protected write(level: NestLoggerLevelType, metadata: LoggerMetadataInterface, ...params: unknown[]): void {
    this.stdout(level, metadata, params, undefined, 'application');
  }
  public override error(...args: unknown[]): void {
    this.write('ERR', this.traceMetadata, ...args);
  }

  public override warn(message: unknown, ...args: unknown[]): void {
    this.write('WRN', this.traceMetadata, message, ...args);
  }

  public override debug(message: unknown, ...args: unknown[]): void {
    this.write('DBG', this.traceMetadata, message, ...args);
  }
}
