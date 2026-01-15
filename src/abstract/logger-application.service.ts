import { Injectable } from '@nestjs/common';
import { LOGGER_LEVEL_ENUM, LoggerAbstract } from './logger.abstract';

@Injectable()
export class LoggerApplicationService extends LoggerAbstract {
  public log(...data: unknown[]): void {
    this.stdout(this.level.LOG, data);
  }

  public info(...data: unknown[]): void {
    this.stdout(this.level.INF, data);
  }

  public warn(...data: unknown[]): void {
    this.stdout(this.level.WRN, data);
  }

  public error(...data: unknown[]): void {
    this.stdout(this.level.ERR, data);
  }

  public debug(...data: unknown[]): void {
    this.stdout(this.level.DBG, data);
  }

  private message(level: LOGGER_LEVEL_ENUM, message: unknown): string {
    if (typeof message === 'string') {
      const color = this.getColor(level);
      return this.colorizeString(message, color);
    }
    return this.prettify(message);
  }

  private stdout(level: LOGGER_LEVEL_ENUM, data: unknown[]): void {
    const stack = this.parseStack();
    this.writeHeader(level, stack.caller, this.getMethodName(stack.method));
    data.forEach((item, index) => {
      process.stdout.write(this.message(level, item));
      if (index !== data.length - 1) {
        process.stdout.write(' ');
      }
    });
    process.stdout.write(`\n${this.getLink(stack.file)}\n`);
  }
}
