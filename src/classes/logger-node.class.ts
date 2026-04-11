import {
  LoggerClass,
  LoggerLevelType,
  LoggerOptionsInterface,
  LoggerOriginInterface,
  LoggerTraceFrameInterface,
} from './logger.class';
import { LoggerEnum } from './logger.map';

export interface LoggerNodeInterface {
  log(message: unknown, ...optionalParams: unknown[]): unknown;
  error(message: unknown, ...optionalParams: unknown[]): unknown;
  warn(message: unknown, ...optionalParams: unknown[]): unknown;
  debug(message: unknown, ...optionalParams: unknown[]): unknown;
  info(message: unknown, ...optionalParams: unknown[]): unknown;
}

export class LoggerNodeClass extends LoggerClass implements LoggerNodeInterface {
  public constructor(options: LoggerOptionsInterface) {
    super(options);
  }

  public log(...data: unknown[]): void {
    this.print('LOG', this.getStack(new Error().stack), data);
  }

  public error(...data: unknown[]): void {
    this.print('ERR', this.getStack(new Error().stack), data);
  }

  public warn(...data: unknown[]): void {
    this.print('WRN', this.getStack(new Error().stack), data);
  }

  public debug(...data: unknown[]): void {
    this.print('DBG', this.getStack(new Error().stack), data);
  }

  public info(...data: unknown[]): void {
    this.print('INF', this.getStack(new Error().stack), data);
  }

  public print(
    level: LoggerLevelType,
    trace: LoggerTraceFrameInterface[] | LoggerOriginInterface,
    args: unknown[],
  ): void {
    if (!Array.isArray(trace)) {
      this.stdout({
        level,
        metadata: this.buildRenderMetadata(trace),
        messages: args,
        debugTrace: this.getStack(new Error().stack),
        formatString: (value) => this.colorizeString(value, LoggerEnum.STRING),
      });
      return;
    }

    const traceIndex = this.options.traceIndex ?? 1;
    const origin = this.resolveOriginFromTrace(trace, traceIndex);
    this.stdout({
      level,
      metadata: this.buildRenderMetadata(origin),
      messages: args,
      debugTrace: this.getStack(new Error().stack),
      formatString: (value) => this.colorizeString(value, LoggerEnum.STRING),
    });
  }

  public getStack(stack?: string): LoggerTraceFrameInterface[] {
    return this.stackToTrace(stack);
  }
}
