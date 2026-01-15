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
      parts.push(this.formatTrace(level, this.stackToTrace(new Error().stack)));
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
    if (!this.options.color) {
      return message;
    }
    if (!/[{}\[\]()'"\/]/.test(message)) {
      return `${baseColor}${message}${this.color.effect.reset}`;
    }
    const tokenRegex = /(\{[^}]*}|\[[^\]]*]|\([^)]*\)|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g;
    let result = '';
    let lastIndex = 0;
    for (const match of message.matchAll(tokenRegex)) {
      const index = match.index;
      const token = match[0];
      if (index > lastIndex) {
        const plain = message.slice(lastIndex, index);
        result += baseColor + this.colorizePathsInText(plain, baseColor);
      }
      const open = token[0];
      const close = token[token.length - 1];
      const inner = token.slice(1, -1);
      let frameColor = this.color.foreground.yellow;
      if (open === '[') frameColor = this.color.foreground.cyan;
      else if (open === '(') frameColor = this.color.foreground.magenta;
      else if (open === '"' || open === "'") frameColor = this.color.foreground.green;
      const innerWithPaths = this.colorizePathsInText(inner, this.color.foreground.white);
      result += this.color.wrap(open, [frameColor]) + innerWithPaths + this.color.wrap(close, [frameColor]);
      lastIndex = index + token.length;
    }
    if (lastIndex < message.length) {
      const tail = message.slice(lastIndex);
      result += baseColor + this.colorizePathsInText(tail, baseColor);
    }
    return `${result}${this.color.effect.reset}`;
  }

  private colorizePathsInText(text: string, baseColor: string): string {
    if (text.indexOf('/') === -1) {
      return text;
    }
    const pathRegex = /(^|[\s,:;=])(\/?[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+)/g;
    return text.replace(pathRegex, (_m, prefix: string, path: string) => {
      return `${prefix}${this.colorizePath(path)}${baseColor}`;
    });
  }

  private colorizePath(path: string): string {
    const isAbsolute = path.startsWith('/');
    const parts = path.split('/').filter(Boolean);
    let out = '';
    // ведущий слеш
    if (isAbsolute) {
      out += this.color.wrap('/', [this.color.effect.dim, this.color.foreground.cyan]);
    }
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        out += this.color.wrap('/', [this.color.effect.dim, this.color.foreground.cyan]);
      }
      out += this.color.wrap(parts[i], [this.color.foreground.cyan]);
    }
    return out;
  }

  private stdout(data: string): void {
    try {
      process.stdout.write(data);
    } catch (e) {
      const error = e as Error;
      const color = this.color; // ConsoleClass
      const message = '---------------[LOGGER STDOUT ERROR]---------------';
      process.stderr.write('\n');
      process.stderr.write(color.wrap(message, [color.effect.bold, color.foreground.red]) + '\n');
      process.stderr.write(
        color.wrap('Source: ', [color.effect.dim]) +
          color.wrap(this.constructor.name, [color.foreground.yellow]) +
          '\n',
      );
      process.stderr.write(
        color.wrap('Error : ', [color.effect.dim]) +
          color.wrap(`${error.name}: ${error.message}`, [color.foreground.red]) +
          '\n',
      );
      // аккуратно разобранный стек
      if (error.stack) {
        const trace = this.stackToTrace(error.stack);
        if (trace.length) {
          process.stderr.write(color.wrap('Stack trace:\n', [color.effect.bold, color.foreground.magenta]));
          for (const item of trace) {
            process.stderr.write(
              '  ' +
                color.wrap('at ', [color.effect.dim]) +
                color.wrap(item.caller, [color.foreground.yellow]) +
                (item.method ? color.wrap(`.${item.method}`, [color.foreground.blue]) : '') +
                ' ' +
                color.wrap(this.excludePath(item.file), [color.foreground.cyan]) +
                '\n',
            );
          }
        }
      }
      process.stderr.write(color.wrap('Original log payload:\n', [color.effect.bold, color.foreground.magenta]));
      process.stderr.write(data.endsWith('\n') ? data : data + '\n');
      process.stderr.write(color.wrap('-'.repeat(message.length), [color.foreground.red]));
    }
  }

  private stackToTrace(stack = ''): LoggerNestMetadataInterface[] {
    if (!stack) {
      return [];
    }
    const result: LoggerNestMetadataInterface[] = [];
    for (const match of stack.matchAll(STACK_REGEXP)) {
      const context = match[1];
      const dotIndex = context.indexOf('.');
      const caller = dotIndex === -1 ? context : context.slice(0, dotIndex);
      const method = dotIndex === -1 ? undefined : context.slice(dotIndex + 1);
      const file = match[2];
      if (file.includes('node_modules') || file.startsWith('node:internal') || (caller === '' && method === '')) {
        continue;
      }
      result.push({ caller, method, file });
    }
    return result;
  }

  private excludePath(path: string): string {
    const root = process.cwd();
    if (!root) {
      return path;
    }
    if (path.startsWith(root)) {
      const rest = path.slice(root.length).replace(/^\/|\/$/g, '');
      return rest || '.';
    }
    return path.replace(/^\/|\/$/g, '');
  }
}
