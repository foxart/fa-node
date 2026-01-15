import { LoggerService } from '@nestjs/common';
import type {
  LoggerMetadataInterface,
  NestLoggerOptionsInterface,
  NestLoggerOutputterInterface,
  NestLoggerRawOutputterInterface,
} from './nest-logger.abstract';
import { NestLoggerAbstract, NestLoggerLevelType } from './nest-logger.abstract';

export class NestLoggerApplicationAbstract extends NestLoggerAbstract implements LoggerService {
  private readonly outputter?: NestLoggerOutputterInterface | NestLoggerRawOutputterInterface;

  public constructor(
    options: NestLoggerOptionsInterface,
    outputter?: NestLoggerOutputterInterface | NestLoggerRawOutputterInterface,
  ) {
    super(options);
    this.outputter = outputter;
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

  protected override output(level: NestLoggerLevelType, line: string): void {
    if (this.outputter) {
      if ('raw' in this.outputter) {
        this.outputter.raw(line);
        return;
      }
      this.outputter.stdout(line);
      return;
    }
    super.output(level, line);
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
