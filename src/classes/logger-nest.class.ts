import * as util from 'node:util';
import { ConsoleClass } from './console.class';

export type LoggerNestLevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG' | 'FTL';

export interface LoggerNestOptionsInterface {
  color?: boolean;
  info?: boolean;
  name?: string;
  pid?: boolean;
  date?: boolean;
  time?: boolean;
  performance?: boolean;
  link?: boolean;
  traceIndex?: number;
  stackError?: boolean;
  stackDebug?: boolean;
  sort?: boolean;
  hidden?: boolean;
}

export interface LoggerNestMetadataInterface {
  file: string;
  caller: string;
  method: string | undefined;
}

const NEST_CALLER_LIST = [
  'NestFactory',
  'InstanceLoader',
  'WebSocketsController',
  'RouterExplorer',
  'RoutesResolver',
  'GraphQLModule',
  'NestApplication',
];

const STACK_REGEXP = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');

export class LoggerNestClass {
  private readonly performanceStart = performance.now();
  private readonly color: ConsoleClass;

  public constructor(protected readonly options: LoggerNestOptionsInterface) {
    this.color = this.options.color ? new ConsoleClass(true) : new ConsoleClass(false);
  }

  public resolveMetadata(stack = '', level: number): LoggerNestMetadataInterface {
    const trace = this.stackToTrace(stack);
    const traceLevel = this.options.traceIndex ?? level;
    const metadata = trace[traceLevel];
    if (metadata) {
      return {
        file: this.excludePath(metadata.file),
        caller: metadata.caller,
        method: metadata.method,
      };
    }
    const nextMetadata = trace.slice(traceLevel).find((item) => {
      return item.caller && item.method;
    });
    return {
      file: this.excludePath(nextMetadata?.file ?? ''),
      caller: nextMetadata?.caller ?? 'unknown',
      method: nextMetadata?.method,
    };
  }

  public resolveCaller(metadata: LoggerNestMetadataInterface): string {
    if (metadata.caller && metadata.caller !== '<anonymous>') {
      return metadata.caller;
    }
    const file = metadata.file || '';
    const base = file.split('/').pop() || file.split('\\').pop() || 'App';
    const stem = base.replace(/\.[^/.]+$/, '');
    if (!stem) return 'App';
    return stem
      .split(/[._-]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  public print(
    level: LoggerNestLevelType,
    metadata: LoggerNestMetadataInterface,
    message: unknown | unknown[],
    callerOverride?: string,
  ): void {
    const caller = callerOverride ?? metadata.caller;
    const data = Array.isArray(message) ? message : [message];
    this.stdout(this.format(level, { ...metadata, caller }, data));
  }

  private format(level: LoggerNestLevelType, metadata: LoggerNestMetadataInterface, data: unknown[]): string {
    const parts: string[] = [];
    parts.push(this.formatHeader(level, metadata));
    parts.push(this.formatMessages(level, data, metadata.caller));
    if (level === 'DBG' && this.options.stackDebug) {
      parts.push(this.formatTrace(level, this.stackToTrace(new Error().stack, true)));
    }
    if (this.options.performance) {
      parts.push(this.formatPerformance());
    }
    if (this.options.link) {
      parts.push(`\n${this.getLink(metadata.file)}`);
    }
    return `${parts.join('')}\n`;
  }

  private formatHeader(level: LoggerNestLevelType, metadata: LoggerNestMetadataInterface): string {
    const parts: string[] = [];
    if (this.options.info) {
      parts.push(`${this.color.wrap(`[${level}]`, [this.getLevelColor(level)])} `);
    }
    if (this.options.name) {
      parts.push(`${this.options.name} `);
    }
    if (this.options.pid) {
      parts.push(`${this.color.wrap(process.pid.toString(), [this.color.foreground.cyan])} `);
    }
    if (this.options.date) {
      parts.push(`${this.getDate()} `);
    }
    if (this.options.time) {
      parts.push(`${this.getTime()} `);
    }
    parts.push(this.getCaller(this.resolveCaller(metadata)));
    const method = this.getMethodName(metadata.method);
    if (method) {
      parts.push(` ${this.getMethod(method)}`);
    }
    parts.push(' ');
    return parts.join('');
  }

  private formatMessage(level: LoggerNestLevelType, message: unknown, caller: string): string {
    if (message instanceof Error) {
      const header = `${this.color.wrap(message.name, [this.color.foreground.red])}${this.color.wrap(': ', [this.color.effect.dim, this.color.foreground.red])}${message.message}`;
      if (this.options.stackError && message.stack) {
        return `${header}\n${message.stack}`;
      }
      return header;
    }
    if (typeof message === 'string') {
      const useLevelColor = NEST_CALLER_LIST.includes(caller);
      const color = useLevelColor ? this.getLevelColor(level) : this.color.foreground.white;
      return this.colorizeString(message, color);
    }
    return this.prettify(message);
  }

  private formatMessages(level: LoggerNestLevelType, data: unknown[], caller: string): string {
    return data
      .map((item) => {
        return this.formatMessage(level, item, caller);
      })
      .join(' ');
  }

  private formatTrace(level: LoggerNestLevelType, trace: LoggerNestMetadataInterface[]): string {
    const color = this.getLevelColor(level);
    const lines = trace
      .filter((item) => {
        return !item.file.includes('node_modules/') && !item.file.includes('node:');
      })
      .map((item) => {
        if (this.options.info) {
          return `${this.color.wrap(' at ', [this.color.effect.dim, color])}${this.excludePath(item.file)}`;
        }
        return `    ${this.excludePath(item.file)}`;
      });
    return `\n${this.color.wrap('{', [this.color.foreground.cyan])}\n${lines.join('\n')}\n${this.color.wrap('}', [this.color.foreground.cyan])} `;
  }

  private formatPerformance(): string {
    const elapsed = Math.floor(performance.now() - this.performanceStart);
    return ` ${this.color.wrap('+', [this.color.effect.dim, this.color.foreground.cyan])}${this.color.wrap(
      elapsed.toString(),
      [this.color.foreground.cyan],
    )}${this.color.wrap('ms', [this.color.effect.dim, this.color.foreground.cyan])}`;
  }

  private getDate(): string {
    const date = new Date();
    return [
      this.color.wrap(`${date.getFullYear()}`.padStart(2, '0'), [this.color.foreground.magenta]),
      this.color.wrap('-', [this.color.foreground.cyan]),
      this.color.wrap(`${date.getMonth() + 1}`.padStart(2, '0'), [this.color.foreground.magenta]),
      this.color.wrap('-', [this.color.foreground.cyan]),
      this.color.wrap(`${date.getDate()}`.padStart(2, '0'), [this.color.foreground.magenta]),
    ].join('');
  }

  private getTime(): string {
    const date = new Date();
    return [
      this.color.wrap(`${date.getHours()}`.padStart(2, '0'), [this.color.foreground.cyan]),
      this.color.wrap(':', [this.color.foreground.magenta]),
      this.color.wrap(`${date.getMinutes()}`.padStart(2, '0'), [this.color.foreground.cyan]),
      this.color.wrap(':', [this.color.foreground.magenta]),
      this.color.wrap(`${date.getSeconds()}`.padStart(2, '0'), [this.color.foreground.cyan]),
    ].join('');
  }

  private getCaller(caller: string): string {
    return this.color.wrap(caller, [this.color.foreground.yellow]);
  }

  private getMethod(method: string): string {
    return this.color.wrap(method, [this.color.foreground.blue]);
  }

  private getLink(file: string): string {
    return `${this.color.wrap('at ', [this.color.foreground.cyan])}${this.excludePath(file)}`;
  }

  private getLevelColor(level: LoggerNestLevelType): string {
    switch (level) {
      case 'LOG':
        return this.color.foreground.green;
      case 'INF':
        return this.color.foreground.blue;
      case 'WRN':
        return this.color.foreground.yellow;
      case 'ERR':
        return this.color.foreground.red;
      case 'DBG':
        return this.color.foreground.magenta;
      default:
        return this.color.foreground.white;
    }
  }

  private getMethodName(method: string | undefined): string | undefined {
    const result = method?.split('.').pop();
    return result === '<anonymous>' ? undefined : result;
  }

  private prettify(data: unknown): string {
    if (typeof data === 'string') {
      return this.color.wrap(data, [this.color.foreground.white]);
    }
    return util.inspect(data, {
      colors: this.options.color,
      showHidden: this.options.hidden,
      sorted: this.options.sort,
      depth: null,
    });
  }

  private colorizeString(message: string, baseColor: string): string {
    const withBraces = message.replace(
      /(\{[^}]*}|\[[^\]]*]|\([^)]*\)|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g,
      (match) => {
        const open = match[0];
        const close = match[match.length - 1];
        const inner = match.slice(1, -1);
        return (
          `${this.color.wrap(open, [this.color.foreground.yellow])}` +
          `${this.color.wrap(inner, [this.color.foreground.white])}` +
          `${this.color.wrap(close, [this.color.foreground.yellow])}${baseColor}`
        );
      },
    );
    return `${baseColor}${withBraces}${this.color.effect.reset}`;
  }

  private stdout(data: string): void {
    try {
      process.stdout.write(data);
    } catch (e) {
      const error = e as Error;
      process.stdout.write('\n---------');
      process.stdout.write(`${this.constructor.name}\n`);
      process.stdout.write(`Message: ${error.message}\n`);
      process.stdout.write(`Name: ${error.name}\n`);
      process.stdout.write('Data: ');
      process.stdout.write(data);
      process.stdout.write('\n');
      process.stdout.write('---------\n');
    }
  }

  private stackToTrace(stack = '', filterNode = false): LoggerNestMetadataInterface[] {
    if (!stack) return [];
    const result: LoggerNestMetadataInterface[] = [];
    for (const match of stack.matchAll(STACK_REGEXP)) {
      const context = match[1];
      const dotIndex = context.indexOf('.');
      const caller = dotIndex === -1 ? context : context.slice(0, dotIndex);
      const method = dotIndex === -1 ? undefined : context.slice(dotIndex + 1);
      const file = match[2];
      if (
        filterNode &&
        (file.includes('node_modules') || file.startsWith('node:internal') || (caller === '' && method === ''))
      ) {
        continue;
      }
      result.push({ caller, method, file });
    }
    return result;
  }

  private excludePath(fromPath: string): string {
    const root = process.cwd();
    if (!root) return fromPath;
    if (fromPath.startsWith(root)) {
      const rest = fromPath.slice(root.length).replace(/^\/|\/$/g, '');
      return rest || '.';
    }
    return fromPath.replace(/^\/|\/$/g, '');
  }
}
