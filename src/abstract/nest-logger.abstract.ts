import * as util from 'node:util';

export interface NestLoggerInterface {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

export interface NestLoggerOptionsInterface {
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

export interface NestLoggerMetadataInterface {
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

export type NestLoggerLevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG' | 'FTL';

export class NestLoggerAbstract {
  private readonly placeholderRegExp = /(\{[^}]+})|('[^']+')|("[^"]+")/g;
  private readonly placeholderSplitRegExp = /(\{[^}]+})|('[^']+')|("[^"]+")|([^{}'"]+)/g;
  private readonly performanceStart = performance.now();
  private readonly color: typeof COLOR_MAP;

  public constructor(
    protected readonly options: NestLoggerOptionsInterface,
    private readonly outputter: NestLoggerInterface = console,
  ) {
    this.color = this.options.color === false ? NO_COLOR_MAP : COLOR_MAP;
  }

  public metadata(stack = '', level: number): NestLoggerMetadataInterface {
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

  public stdout(
    level: NestLoggerLevelType,
    metadata: NestLoggerMetadataInterface,
    message: unknown | unknown[],
    callerOverride?: string,
    mode: 'system' | 'application' = 'system',
  ): void {
    const caller = callerOverride ?? metadata.caller;
    const data = Array.isArray(message) ? message : [message];
    const normalizedMetadata = { ...metadata, caller };
    const line = this.formatLine(level, normalizedMetadata, data, mode);
    this.output(level, line);
  }

  private output(level: NestLoggerLevelType, line: string): void {
    const outputter = this.outputter;
    switch (level) {
      case 'INF':
        outputter.info(line);
        break;
      case 'WRN':
        outputter.warn(line);
        break;
      case 'ERR':
      case 'FTL':
        outputter.error(line);
        break;
      case 'DBG':
        outputter.debug(line);
        break;
      default:
        outputter.log(line);
        break;
    }
  }

  private formatLine(
    level: NestLoggerLevelType,
    metadata: NestLoggerMetadataInterface,
    data: unknown[],
    mode: 'system' | 'application',
  ): string {
    const parts: string[] = [];
    parts.push(this.formatHeader(level, metadata));
    parts.push(this.formatMessages(level, data, metadata.caller, mode));
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

  private formatHeader(level: NestLoggerLevelType, metadata: NestLoggerMetadataInterface): string {
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

  private formatMessage(
    level: NestLoggerLevelType,
    message: unknown,
    caller: string,
    mode: 'system' | 'application',
  ): string {
    if (message instanceof Error) {
      const header = `${this.color.red}${message.name}${this.color.reset}: ${message.message}`;
      if (this.options.stackError && message.stack) {
        return `${header}\n${message.stack}`;
      }
      return header;
    }
    if (typeof message === 'string') {
      const useLevelColor = mode === 'application' || NEST_CALLERS.includes(caller);
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

  private formatMessages(
    level: NestLoggerLevelType,
    data: unknown[],
    caller: string,
    mode: 'system' | 'application',
  ): string {
    return data
      .map((item) => {
        return this.formatMessage(level, item, caller, mode);
      })
      .join(' ');
  }

  private formatTrace(level: NestLoggerLevelType, trace: NestLoggerMetadataInterface[]): string {
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
    if (this.options.color === false) {
      return `+${elapsed}ms `;
    }
    return `${this.color.gray}+${elapsed}ms${this.color.reset} `;
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

  private getLevelColor(level: NestLoggerLevelType): string {
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
      colors: this.options.color !== false,
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

  private stackToTrace(stack = '', filterNode = false): NestLoggerMetadataInterface[] {
    if (!stack) return [];
    const result: NestLoggerMetadataInterface[] = [];
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
