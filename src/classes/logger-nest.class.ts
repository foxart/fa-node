import * as util from 'node:util';

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

const COLOR_MAP = {
  red: '\u001b[31m',
  green: '\u001b[32m',
  blue: '\u001b[34m',
  yellow: '\u001b[33m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  reset: '\u001b[0m',
};

const NO_COLOR_MAP = {
  red: '',
  green: '',
  blue: '',
  yellow: '',
  magenta: '',
  cyan: '',
  white: '',
  gray: '',
  reset: '',
};

const EFFECT_MAP = {
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  reset: '\u001b[0m',
};

const NO_EFFECT_MAP = {
  bold: '',
  dim: '',
  reset: '',
};

const NEST_CALLERS = [
  'NestFactory',
  'InstanceLoader',
  'WebSocketsController',
  'RouterExplorer',
  'RoutesResolver',
  'GraphQLModule',
  'NestApplication',
];

const STACK_REGEXP = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');

export type LoggerNestLevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG' | 'FTL';

export class LoggerNestClass {
  private readonly placeholderRegExp = /(\{[^}]+})|('[^']+')|("[^"]+")/g;
  private readonly placeholderSplitRegExp = /(\{[^}]+})|('[^']+')|("[^"]+")|([^{}'"]+)/g;
  private readonly performanceStart = performance.now();
  private readonly color: typeof COLOR_MAP;
  private readonly effect: typeof EFFECT_MAP;

  public constructor(protected readonly options: LoggerNestOptionsInterface) {
    this.color = this.options.color === true ? COLOR_MAP : NO_COLOR_MAP;
    this.effect = this.options.color === true ? EFFECT_MAP : NO_EFFECT_MAP;
  }

  public metadata(stack = '', level: number): LoggerNestMetadataInterface {
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
      parts.push(`${this.color.reset}[${this.getLevelColor(level)}${level}${this.color.reset}] `);
    }
    if (this.options.name) {
      parts.push(`${this.options.name} `);
    }
    if (this.options.pid) {
      parts.push(`${this.color.cyan}${process.pid}${this.color.reset} `);
    }
    if (this.options.date) {
      parts.push(`${this.getDate()} `);
    }
    if (this.options.time) {
      parts.push(`${this.getTime()} `);
    }
    parts.push(this.getCaller(metadata.caller));
    const method = this.getMethodName(metadata.method);
    if (method) {
      parts.push(` ${this.getMethod(method)}`);
    }
    parts.push(' ');
    return parts.join('');
  }

  private formatMessage(level: LoggerNestLevelType, message: unknown, caller: string): string {
    if (message instanceof Error) {
      const header = `${this.color.red}${message.name}${this.color.reset}: ${message.message}`;
      if (this.options.stackError && message.stack) {
        return `${header}\n${message.stack}`;
      }
      return header;
    }
    if (typeof message === 'string') {
      const useLevelColor = NEST_CALLERS.includes(caller);
      const color = useLevelColor ? this.getLevelColor(level) : this.color.white;
      if (this.options.color === false) {
        return message;
      }
      this.placeholderRegExp.lastIndex = 0;
      if (useLevelColor && this.placeholderRegExp.test(message)) {
        this.placeholderSplitRegExp.lastIndex = 0;
        return message.replace(this.placeholderSplitRegExp, (...args) => {
          const [, bracket, single, double, plain] = args as [
            string,
            string | undefined,
            string | undefined,
            string | undefined,
            string | undefined,
          ];
          if (bracket || single || double) {
            return this.wrapData(bracket ?? single ?? double ?? '', [this.color.white]);
          }
          return this.wrapData(plain ?? '', [color]);
        });
      }
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
          return `${color} at ${this.color.reset}${this.excludePath(item.file)}`;
        }
        return `    ${this.excludePath(item.file)}`;
      });
    return `\n${this.color.cyan}{${this.color.reset}\n${lines.join('\n')}\n${this.color.cyan}}${this.color.reset} `;
  }

  private formatPerformance(): string {
    const elapsed = Math.floor(performance.now() - this.performanceStart);
    return ` ${this.effect.dim}${this.color.cyan}+${this.effect.reset}${this.color.cyan}${elapsed}${this.effect.dim}${this.color.cyan}ms${this.color.reset}`;
  }

  private getDate(): string {
    const date = new Date();
    return [
      this.color.magenta,
      `${date.getFullYear()}`.padStart(2, '0'),
      '-',
      `${date.getMonth() + 1}`.padStart(2, '0'),
      '-',
      `${date.getDate()}`.padStart(2, '0'),
      this.color.reset,
    ].join('');
  }

  private getTime(): string {
    const date = new Date();
    return [
      this.color.cyan,
      `${date.getHours()}`.padStart(2, '0'),
      ':',
      `${date.getMinutes()}`.padStart(2, '0'),
      ':',
      `${date.getSeconds()}`.padStart(2, '0'),
      this.color.reset,
    ].join('');
  }

  private getCaller(caller: string): string {
    return [this.color.yellow, caller, this.color.reset].join('');
  }

  private getMethod(method: string): string {
    return [this.color.blue, method, this.color.reset].join('');
  }

  private getLink(file: string): string {
    return [this.color.cyan, 'at ', this.color.reset, this.excludePath(file), this.color.reset].join('');
  }

  private getLevelColor(level: LoggerNestLevelType): string {
    switch (level) {
      case 'LOG':
        return this.color.green;
      case 'INF':
        return this.color.blue;
      case 'WRN':
        return this.color.yellow;
      case 'ERR':
        return this.color.red;
      case 'DBG':
        return this.color.magenta;
      default:
        return this.color.white;
    }
  }

  private getMethodName(method: string | undefined): string | undefined {
    const result = method?.split('.').pop();
    return result === '<anonymous>' ? undefined : result;
  }

  private prettify(data: unknown): string {
    if (typeof data === 'string') {
      return `${this.color.white}${data}${this.color.reset}`;
    }
    return util.inspect(data, {
      colors: this.options.color,
      showHidden: this.options.hidden,
      sorted: this.options.sort,
      depth: null,
    });
  }

  private colorizeString(message: string, baseColor: string): string {
    if (this.options.color === false) {
      return message;
    }
    const withBraces = message.replace(/\{[^}]+}/g, (match) => {
      const inner = match.slice(1, -1);
      return `${this.color.yellow}{${this.color.white}${inner}${this.color.yellow}}${baseColor}`;
    });
    return `${baseColor}${withBraces}${this.color.reset}`;
  }

  private wrapData(data: string, styles: string[]): string {
    if (this.options.color === false) {
      return data;
    }
    return `${styles.join('')}${data}${EFFECT_MAP.reset}`;
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
