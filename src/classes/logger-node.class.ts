import {
  LoggerClass,
  LoggerLevelType,
  LoggerMetadataInterface,
  LoggerNodeInterface,
  LoggerOptionsInterface,
} from './logger.class';

interface TraceInterface {
  file: string;
  caller: string;
  method: string | undefined;
}

interface OutputMetadataInterface {
  file: string;
  caller?: string;
  method?: string;
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

  public resolveMetadata(stack = '', level: number): LoggerMetadataInterface {
    return this.resolveMetadataFromTrace(this.getStack(stack), level);
  }

  public resolveCaller(metadata: LoggerMetadataInterface): string {
    return this.resolveCallerValue(metadata);
  }

  public print(level: LoggerLevelType, trace: TraceInterface[] | LoggerMetadataInterface, args: unknown[]): void {
    if (!Array.isArray(trace)) {
      this.stdout(this.formatOutput(level, trace, args));
      return;
    }

    const metadata = this.resolveOutputMetadata(trace);
    this.stdout(this.formatOutput(level, metadata, args));
  }

  public getStack(stack?: string): TraceInterface[] {
    return this.stackToTrace(stack, false).map((item) => {
      return {
        caller: item.caller,
        method: item.method,
        file: item.file,
      };
    });
  }

  private formatOutput(
    level: LoggerLevelType,
    metadata: OutputMetadataInterface | LoggerMetadataInterface | undefined,
    args: unknown[],
  ): string {
    const parts: string[] = [];
    this.pushPart(parts, this.formatStandardHeader(level, metadata?.caller, metadata?.method));
    this.pushPart(parts, this.formatMessageSeparator(level));
    this.pushPart(
      parts,
      this.formatMessageList(
        args,
        (stackTrace) => this.formatTraceBlock('ERR', stackTrace),
        (value) => this.prettifyValue(value),
      ),
    );
    this.pushPart(
      parts,
      this.formatTraceSuffix(level, this.getStack(new Error().stack), this.shouldRenderDebugTrace(level)),
    );
    this.pushPart(parts, this.formatPerformanceSuffix());
    this.pushPart(parts, this.formatLinkSuffix(level, metadata?.file ?? ''));
    return `${parts.join('')}\n`;
  }

  private resolveOutputMetadata(trace: TraceInterface[]): OutputMetadataInterface | undefined {
    const metadata = trace[this.getTraceIndex()];
    if (metadata) {
      return {
        file: metadata.file,
        caller: metadata.caller,
        method: this.resolveMethod(metadata.method),
      };
    }
    const nextMetadata = trace.slice(this.getTraceIndex()).find((item) => {
      return item.caller && item.method;
    });
    if (!nextMetadata) {
      return undefined;
    }
    return {
      file: nextMetadata.file,
      caller: nextMetadata.caller,
      method: this.resolveMethod(nextMetadata.method),
    };
  }
}
