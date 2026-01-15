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

  protected get metadata(): LoggerNestMetadataInterface {
    return this.logger.metadata(new Error().stack, 2);
  }

  public log(message: unknown, ...args: unknown[]): void {
    this.stdout('LOG', this.metadata, message, ...args);
  }

  public error(...args: unknown[]): void {
    this.stdout('ERR', this.metadata, ...args);
  }

  public warn(message: unknown, ...args: unknown[]): void {
    this.stdout('WRN', this.metadata, message, ...args);
  }

  public debug(message: unknown, ...args: unknown[]): void {
    this.stdout('DBG', this.metadata, message, ...args);
  }

  public info(message: unknown, ...args: unknown[]): void {
    this.stdout('INF', this.metadata, message, ...args);
  }

  protected stdout(level: LoggerNestLevelType, metadata: LoggerNestMetadataInterface, ...params: unknown[]): void {
    this.logger.print(level, metadata, params, undefined);
  }
}
