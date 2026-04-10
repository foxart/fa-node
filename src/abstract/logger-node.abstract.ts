import { LoggerNodeClass, LoggerNodeInterface } from '../classes/logger-node.class';
import { LoggerLevelType, LoggerOptionsInterface, LoggerOriginInterface } from '../classes/logger.class';

export class LoggerNodeAbstract implements LoggerNodeInterface {
  private readonly logger: LoggerNodeClass;

  public constructor(options: LoggerOptionsInterface) {
    this.logger = new LoggerNodeClass(options);
  }

  protected get origin(): LoggerOriginInterface {
    return this.logger.resolveOrigin(new Error().stack, 2);
  }

  public log(message?: unknown, ...params: unknown[]): void {
    this.stdout('LOG', this.origin, message, ...params);
  }

  public error(message?: unknown, ...params: unknown[]): void {
    this.stdout('ERR', this.origin, message, ...params);
  }

  public warn(message?: unknown, ...params: unknown[]): void {
    this.stdout('WRN', this.origin, message, ...params);
  }

  public debug(message?: unknown, ...params: unknown[]): void {
    this.stdout('DBG', this.origin, message, ...params);
  }

  public info(message?: unknown, ...params: unknown[]): void {
    this.stdout('INF', this.origin, message, ...params);
  }

  public errorWithStack(stack: string | undefined, message?: unknown, ...params: unknown[]): void {
    const origin = stack ? this.logger.resolveOrigin(stack, 0) : this.origin;
    this.stdout('ERR', origin, message, ...params);
  }

  protected stdout(level: LoggerLevelType, origin: LoggerOriginInterface, ...params: unknown[]): void {
    this.logger.print(level, origin, params);
  }
}
