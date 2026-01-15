import { LoggerService } from '@nestjs/common';
import type {
  LoggerNestFormatterInterface,
  LoggerNestMetadataInterface,
  LoggerNestOptionsInterface,
  LoggerNestOutputterInterface,
} from './logger-nest.class';
import { LoggerNestClass, LoggerNestLevelType } from './logger-nest.class';

export class NestLoggerApplicationAbstract implements LoggerService {
  private readonly outputter: LoggerNestFormatterInterface | LoggerNestOutputterInterface;

  public constructor(
    options: LoggerNestOptionsInterface,
    outputter?: LoggerNestFormatterInterface | LoggerNestOutputterInterface,
  ) {
    this.outputter = outputter ?? new LoggerNestClass(options);
  }

  private get traceMetadata(): LoggerNestMetadataInterface {
    if (this.isFormatter(this.outputter)) {
      return this.outputter.metadata(new Error().stack, 2);
    }
    return this.fallbackMetadata(new Error().stack, 2);
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
    if (this.isFormatter(this.outputter)) {
      this.outputter.stdout(level, metadata, params, undefined, 'application');
      return;
    }
    this.outputByLevel(level, ...params);
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
