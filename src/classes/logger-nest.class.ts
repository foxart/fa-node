import {
  LoggerClass,
  LoggerLevelType,
  LoggerMetadataOutputOptionsInterface,
  LoggerOptionsInterface,
  LoggerOriginInterface,
  LoggerTokenType,
} from './logger.class';

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

  public print(
    level: LoggerLevelType,
    origin: LoggerOriginInterface,
    message: unknown | unknown[],
    metadataOptions: LoggerMetadataOutputOptionsInterface = {},
  ): void {
    const data = Array.isArray(message) ? message : [message];
    const metadata = this.buildRenderMetadata(origin, metadataOptions);
    const base =
      metadata && NEST_CALLER_LIST.includes(metadata.caller) ? LoggerTokenType.CONTEXT : LoggerTokenType.DEFAULT;
    this.stdout({
      level,
      metadata,
      messages: data,
      debugTrace: this.stackToTrace(new Error().stack),
      formatString: (value) => {
        return this.colorizeMessage(value, base, (t) => {
          return HTTP_METHOD_SET.has(t);
        });
      },
    });
  }

  private colorizeMessage(
    message: string,
    baseType: LoggerTokenType,
    isHttpMethod: (value: string) => boolean = () => false,
  ): string {
    if (!this.options.color) {
      return message;
    }
    return message
      .split(/(\s+)/)
      .map((chunk) => {
        if (/^\s+$/.test(chunk)) {
          return chunk;
        }
        const match = chunk.match(/[A-Z]+/);
        if (match && isHttpMethod(match[0])) {
          return chunk.replace(match[0], this.render(LoggerTokenType.METHOD, match[0]));
        }
        const type = chunk.includes('/') ? LoggerTokenType.URL : baseType;
        return this.colorizeString(chunk, type);
      })
      .join('');
  }
}
