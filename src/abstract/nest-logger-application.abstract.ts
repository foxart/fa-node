import { LoggerService } from '@nestjs/common';
import { ConsoleOptionsInterface } from '../classes/console-system.class';
import { ParserTraceInterface } from '../helpers/parser.helper';
import { NestLoggerAbstract, NestLoggerLevelType } from './nest-logger.abstract';

class Console extends NestLoggerAbstract {
  public constructor(options: ConsoleOptionsInterface) {
    super(options);
  }
}

export abstract class NestLoggerApplicationAbstract implements LoggerService {
  private readonly console: Console;

  protected constructor(options: ConsoleOptionsInterface) {
    this.console = new Console(options);
  }

  protected get metadata(): ParserTraceInterface {
    return this.console.metadata(new Error().stack, 2);
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

  protected stdout(
    level: NestLoggerLevelType,
    metadata: ParserTraceInterface,
    ...params: [...unknown[]] | [...unknown[], string]
  ): void {
    this.console.stdout(level, metadata, params);
  }
}
