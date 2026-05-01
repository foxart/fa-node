import { StackHelper } from '../helpers/stack.helper';
import {
  LoggerClass,
  LoggerConfigInterface,
  LoggerLevelType,
  LoggerMetadataOutputOptionsInterface,
  LoggerOriginInterface,
  StackFrameInterface,
} from './logger.class';
import { LoggerEnum } from './logger.map';

interface LoggerNodeInterface {
  log(message: unknown, ...optionalParams: unknown[]): unknown;
  error(message: unknown, ...optionalParams: unknown[]): unknown;
  warn(message: unknown, ...optionalParams: unknown[]): unknown;
  debug(message: unknown, ...optionalParams: unknown[]): unknown;
  info(message: unknown, ...optionalParams: unknown[]): unknown;
}

export class LoggerNode extends LoggerClass implements LoggerNodeInterface {
  private readonly argsMap: (value: unknown[]) => unknown[];

  public constructor(config: LoggerConfigInterface, formatLogString?: (value: unknown[]) => unknown[]) {
    super(config);
    this.argsMap = formatLogString ?? ((value: unknown[]): unknown[] => value);
  }

  protected get origin(): LoggerOriginInterface {
    return this.resolveOrigin(new Error().stack, 2);
  }

  public log(...data: unknown[]): void {
    this.print('LOG', StackHelper.toTrace(new Error().stack), data);
  }

  public error(...data: unknown[]): void {
    this.print('ERR', StackHelper.toTrace(new Error().stack), data);
  }

  public warn(...data: unknown[]): void {
    this.print('WRN', StackHelper.toTrace(new Error().stack), data);
  }

  public debug(...data: unknown[]): void {
    this.print('DBG', StackHelper.toTrace(new Error().stack), data);
  }

  public info(...data: unknown[]): void {
    this.print('INF', StackHelper.toTrace(new Error().stack), data);
  }

  public print(level: LoggerLevelType, trace: StackFrameInterface[] | LoggerOriginInterface, args: unknown[]): void {
    if (!Array.isArray(trace)) {
      this.stdout({
        level,
        metadata: this.buildRenderMetadata(trace),
        messages: this.argsMap(args),
        debugTrace: StackHelper.toTrace(new Error().stack),
        formatString: (value) => this.colorizeString(value, LoggerEnum.STRING),
      });
      return;
    }
    const traceIndex = this.config.traceIndex ?? 1;
    const origin = StackHelper.resolveOrigin(trace, traceIndex);
    this.stdout({
      level,
      metadata: this.buildRenderMetadata(origin),
      messages: this.argsMap(args),
      debugTrace: StackHelper.toTrace(new Error().stack),
      formatString: (value) => this.colorizeString(value, LoggerEnum.STRING),
    });
  }

  public writeWithMetadata(
    level: LoggerLevelType,
    metadataOptions: LoggerMetadataOutputOptionsInterface,
    ...args: unknown[]
  ): void {
    const origin = this.origin;
    this.stdout({
      level,
      metadata: this.buildRenderMetadata(origin, metadataOptions),
      messages: this.argsMap(args),
      debugTrace: StackHelper.toTrace(new Error().stack),
      formatString: (value) => this.colorizeString(value, LoggerEnum.STRING),
    });
  }

  public errorWithStack(stack: string | undefined, message?: unknown, ...params: unknown[]): void {
    const origin = stack ? this.resolveOrigin(stack, 0) : this.origin;
    this.write('ERR', origin, message, ...params);
  }

  protected write(level: LoggerLevelType, origin: LoggerOriginInterface, ...params: unknown[]): void {
    this.print(level, origin, params);
  }
}
//
//
a = 1;
