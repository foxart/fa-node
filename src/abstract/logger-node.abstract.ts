import { LoggerNodeClass, LoggerNodeInterface } from '../classes/logger-node.class';
import { LoggerLevelType, LoggerMetadataInterface, LoggerOptionsInterface } from '../classes/logger.class';

export class LoggerNodeAbstract implements LoggerNodeInterface {
  private readonly logger: LoggerNodeClass;

  public constructor(options: LoggerOptionsInterface) {
    this.logger = new LoggerNodeClass(options);
  }

  protected get metadata(): LoggerMetadataInterface {
    return this.logger.resolveMetadata(new Error().stack, 2);
  }

  public log(message?: unknown, ...params: unknown[]): void {
    this.stdout('LOG', this.metadata, message, ...params);
  }

  public error(message?: unknown, ...params: unknown[]): void {
    this.stdout('ERR', this.metadata, message, ...params);
  }

  // TODO: metadata here can come from two different sources:
  // current logger call stack (`this.metadata`) or explicit error stack
  // (`this.logger.resolveMetadata(stack, 0)`). Unify this with LoggerNestAbstract

  public warn(message?: unknown, ...params: unknown[]): void {
    this.stdout('WRN', this.metadata, message, ...params);
  }

  public debug(message?: unknown, ...params: unknown[]): void {
    this.stdout('DBG', this.metadata, message, ...params);
  }

  public info(message?: unknown, ...params: unknown[]): void {
    this.stdout('INF', this.metadata, message, ...params);
  }

  // via one shared helper so node/nest resolve caller/link the same way.
  public errorWithStack(stack: string | undefined, message?: unknown, ...params: unknown[]): void {
    const metadata = stack ? this.logger.resolveMetadata(stack, 0) : this.metadata;
    this.stdout('ERR', metadata, message, ...params);
  }

  protected stdout(level: LoggerLevelType, metadata: LoggerMetadataInterface, ...params: unknown[]): void {
    const caller = this.logger.resolveCaller(metadata);
    const safeMetadata: LoggerMetadataInterface = {
      ...metadata,
      caller,
      method: this.logger.resolveMethod(metadata.method),
    };
    this.logger.print(level, safeMetadata, params);
  }
}
