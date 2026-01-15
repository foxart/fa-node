import { LoggerService } from '@nestjs/common';
import {
  LoggerNestClass,
  LoggerNestLevelType,
  LoggerNestMetadataInterface,
  LoggerNestOptionsInterface,
} from '../classes/logger-nest.class';

export class LoggerApplicationNest implements LoggerService {
  private readonly logger: LoggerNestClass;

  public constructor(options: LoggerNestOptionsInterface) {
    this.logger = new LoggerNestClass(options);
  }

  private get metadata(): LoggerNestMetadataInterface {
    return this.logger.metadata(new Error().stack, 2);
  }

  public log(message: unknown, ...args: unknown[]): void {
    this.write('LOG', this.metadata, message, ...args);
  }

  public error(...args: unknown[]): void {
    this.write('ERR', this.metadata, ...args);
  }

  public warn(message: unknown, ...args: unknown[]): void {
    this.write('WRN', this.metadata, message, ...args);
  }

  public debug(message: unknown, ...args: unknown[]): void {
    this.write('DBG', this.metadata, message, ...args);
  }

  public info(message: unknown, ...args: unknown[]): void {
    this.write('INF', this.metadata, message, ...args);
  }

  protected write(level: LoggerNestLevelType, metadata: LoggerNestMetadataInterface, ...params: unknown[]): void {
    this.logger.print(level, metadata, params, undefined);
  }
}
