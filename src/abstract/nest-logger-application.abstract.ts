import { LoggerService } from '@nestjs/common';
import { LoggerSystemOptionsInterface } from '../classes/logger-system.class';
import {
  LoggerNestClass,
  LoggerNestInterface,
  LoggerNestLevelType,
  LoggerNestMetadataInterface,
} from './logger-nest.class';

export class NestLoggerApplicationAbstract implements LoggerService {
  private readonly logger: LoggerNestInterface;

  public constructor(options: LoggerSystemOptionsInterface) {
    this.logger = new LoggerNestClass(options);
  }

  private get traceMetadata(): LoggerNestMetadataInterface {
    return this.logger.metadata(new Error().stack, 2);
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

  protected write(level: LoggerNestLevelType, metadata: LoggerNestMetadataInterface, ...params: unknown[]): void {
    if (this.logger.stdout) {
      this.logger.stdout(level, metadata, params, undefined, 'application');
      return;
    }
    this.outputByLevel(level, ...params);
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
