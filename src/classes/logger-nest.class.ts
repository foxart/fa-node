import { LoggerClass, LoggerLevelType, LoggerMetadataInterface, LoggerOptionsInterface } from './logger.class';

const NEST_CALLER_LIST = [
  'NestFactory',
  'InstanceLoader',
  'WebSocketsController',
  'RouterExplorer',
  'RoutesResolver',
  'GraphQLModule',
  'NestApplication',
];
const HTTP_METHOD_SET = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

export class LoggerNestClass extends LoggerClass {
  public constructor(options: LoggerOptionsInterface) {
    super(options);
  }

  public resolveMetadata(stack = '', level: number): LoggerMetadataInterface {
    return this.resolveMetadataFromTrace(this.stackToTrace(stack), level);
  }

  public resolveCaller(metadata: LoggerMetadataInterface): string {
    return this.resolveCallerValue(metadata);
  }

  public print(
    level: LoggerLevelType,
    metadata: LoggerMetadataInterface,
    message: unknown | unknown[],
    callerOverride?: string,
  ): void {
    const caller = callerOverride ?? metadata.caller;
    const data = Array.isArray(message) ? message : [message];
    this.stdout(this.format(level, { ...metadata, caller }, data));
  }

  private format(level: LoggerLevelType, metadata: LoggerMetadataInterface, data: unknown[]): string {
    const parts: string[] = [];
    this.pushPart(parts, this.formatStandardHeader(level, this.resolveCaller(metadata), metadata.method));
    this.pushPart(parts, this.formatMessageSeparator(level));
    this.pushPart(
      parts,
      this.formatMessageList(
        data,
        (trace) => this.formatTraceBlock('ERR', trace),
        (value) => {
          if (typeof value === 'string') {
            return this.colorizeString(value, 'text', (token) => HTTP_METHOD_SET.has(token));
          }
          return this.prettifyValue(value);
        },
        (value) => {
          const useLevelColor = NEST_CALLER_LIST.includes(metadata.caller);
          return this.colorizeString(value, useLevelColor ? 'systemText' : 'text', (token) =>
            HTTP_METHOD_SET.has(token),
          );
        },
      ),
    );
    this.pushPart(
      parts,
      this.formatTraceSuffix(level, this.stackToTrace(new Error().stack), this.shouldRenderDebugTrace(level)),
    );
    this.pushPart(parts, this.formatPerformanceSuffix());
    this.pushPart(parts, this.formatLinkSuffix(level, metadata.file));
    return `${parts.join('')}\n`;
  }
}
