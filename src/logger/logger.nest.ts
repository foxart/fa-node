import { StackHelper } from '../helpers/stack.helper';
import {
  LoggerClass,
  LoggerLevelType,
  LoggerMetadataOutputOptionsInterface,
  LoggerOptionsInterface,
  LoggerOriginInterface,
} from './logger.class';
import { LoggerEnum } from './logger.map';

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

export type LogLevel = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];

export interface LoggerNestInterface {
  log(message: unknown, ...optionalParams: unknown[]): unknown;
  error(message: unknown, ...optionalParams: unknown[]): unknown;
  warn(message: unknown, ...optionalParams: unknown[]): unknown;
  debug?(message: unknown, ...optionalParams: unknown[]): unknown;
  verbose?(message: unknown, ...optionalParams: unknown[]): unknown;
  fatal?(message: unknown, ...optionalParams: unknown[]): unknown;
  setLogLevels?(levels: LogLevel[]): unknown;
}

export class LoggerNest extends LoggerClass implements LoggerNestInterface {
  private static readonly LOGGER_METHOD_SET = new Set(['log', 'error', 'warn', 'debug', 'verbose', 'fatal']);
  private static readonly LOGGER_METADATA_OPTIONS: LoggerMetadataOutputOptionsInterface = {
    hideMethodSet: LoggerNest.LOGGER_METHOD_SET,
  };

  public constructor(options: LoggerOptionsInterface) {
    super(options);
  }

  protected get origin(): LoggerOriginInterface {
    return this.resolveOrigin(new Error().stack, 2);
  }

  public log(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('LOG', this.origin, context, message, ...params);
  }

  public error(message: unknown, ...params: unknown[]): void {
    const origin = this.origin;
    let context: string | undefined;
    let stack: string | undefined;
    if (params.length > 0 && typeof params[0] === 'string' && /\n\s*at\s+/m.test(params[0])) {
      stack = params.shift() as string;
    }
    if (params.length > 0 && typeof params[params.length - 1] === 'string') {
      context = params.pop() as string;
    }
    const caller = context ?? '';
    const outputMessages: unknown[] = [];
    if (stack && typeof message === 'string') {
      const match = message.match(/^([^:]+):\s*(.*)$/);
      outputMessages.push({
        name: match?.[1] || 'Error',
        message: match?.[2] || message,
        stack,
      });
    } else if (message !== undefined) {
      outputMessages.push(message);
    }
    for (const param of params) {
      outputMessages.push(param);
    }
    const [firstMessage, ...restMessages] = outputMessages.length > 0 ? outputMessages : [undefined];
    if (firstMessage !== undefined) {
      this.write('ERR', stack ? this.resolveOrigin(stack, 0) : origin, caller, firstMessage, ...restMessages);
    }
  }

  public warn(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('WRN', this.origin, context, message, ...params);
  }

  public debug(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('DBG', this.origin, context, message, ...params);
  }

  public verbose(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('INF', this.origin, context, message, ...params);
  }

  public fatal(message?: unknown, ...params: unknown[]): void {
    const context = typeof params[params.length - 1] === 'string' ? (params.pop() as string) : undefined;
    this.write('FTL', this.origin, context, message, ...params);
  }

  public print(
    level: LoggerLevelType,
    origin: LoggerOriginInterface,
    message: unknown | unknown[],
    metadataOptions: LoggerMetadataOutputOptionsInterface = {},
  ): void {
    const data = Array.isArray(message) ? message : [message];
    const metadata = this.buildRenderMetadata(origin, metadataOptions);
    const base = metadata && NEST_CALLER_LIST.includes(metadata.caller) ? LoggerEnum.CONTEXT : LoggerEnum.DEFAULT;
    this.stdout({
      level,
      metadata,
      messages: data,
      debugTrace: StackHelper.toTrace(new Error().stack),
      formatString: (value) => {
        return this.colorizeMessage(value, base, (t) => {
          return HTTP_METHOD_SET.has(t);
        });
      },
    });
  }

  protected write(
    level: LoggerLevelType,
    origin: LoggerOriginInterface,
    context: string | undefined,
    message: unknown,
    ...params: unknown[]
  ): void {
    if (message === 'Nest application successfully started') {
      return;
    }
    this.print(level, origin, [message, ...params], {
      ...LoggerNest.LOGGER_METADATA_OPTIONS,
      callerOverride: context,
    });
  }

  private colorizeMessage(
    message: string,
    baseType: LoggerEnum,
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
          return chunk.replace(match[0], this.render(LoggerEnum.METHOD, match[0]));
        }
        const type = chunk.includes('/') ? LoggerEnum.URL : baseType;
        return this.colorizeString(chunk, type);
      })
      .join('');
  }
}
