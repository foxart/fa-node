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

export interface LoggerNestFormatterInterface {
  metadata: (stack?: string, level?: number) => LoggerNestMetadataInterface;
  stdout: (
    level: LoggerNestLevelType,
    metadata: LoggerNestMetadataInterface,
    message: unknown | unknown[],
    callerOverride?: string,
    mode?: 'system' | 'application',
  ) => void;
  format: (
    level: LoggerNestLevelType,
    metadata: LoggerNestMetadataInterface,
    message: unknown | unknown[],
    callerOverride?: string,
    mode?: 'system' | 'application',
  ) => string;
  raw: (data: string) => void;
}

export interface LoggerNestOutputterInterface {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  fatal?: (...args: unknown[]) => void;
  stdout?: (data: string) => void;
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

const BACKGROUND_MAP = {
  red: '\u001b[41m',
  green: '\u001b[42m',
  blue: '\u001b[44m',
  yellow: '\u001b[43m',
  magenta: '\u001b[45m',
  white: '\u001b[47m',
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

const NO_BACKGROUND_MAP = {
  red: '',
  green: '',
  blue: '',
  yellow: '',
  magenta: '',
  white: '',
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

export type LoggerNestLevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG' | 'FTL';

export class LoggerNestClass {
  private readonly placeholderRegExp = /(\{[^}]+})|('[^']+')|("[^"]+")/g;
  private readonly placeholderSplitRegExp = /(\{[^}]+})|('[^']+')|("[^"]+")|([^{}'"]+)/g;
  private readonly performanceStart = performance.now();
  private readonly color: typeof COLOR_MAP;
  private readonly background: typeof BACKGROUND_MAP;
  private readonly traceIndex: number;

  public constructor(protected readonly options: LoggerNestOptionsInterface) {
    this.color = this.options.color === false ? NO_COLOR_MAP : COLOR_MAP;
    this.background = this.options.color === false ? NO_BACKGROUND_MAP : BACKGROUND_MAP;
    this.traceIndex = this.options.traceIndex ?? 1;
  }

  public log(...data: unknown[]): void {
    this.print('LOG', this.getStack(new Error().stack), data);
  }

  public info(...data: unknown[]): void {
    this.print('INF', this.getStack(new Error().stack), data);
  }

  public warn(...data: unknown[]): void {
    this.print('WRN', this.getStack(new Error().stack), data);
  }

  public error(...data: unknown[]): void {
    this.print('ERR', this.getStack(new Error().stack), data);
  }

  public debug(...data: unknown[]): void {
    this.print('DBG', this.getStack(new Error().stack), data);
  }

  public fatal(...data: unknown[]): void {
    this.print('FTL', this.getStack(new Error().stack), data);
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

  public stdout(
    level: LoggerNestLevelType,
    metadata: LoggerNestMetadataInterface,
    message: unknown | unknown[],
    callerOverride?: string,
    mode: 'system' | 'application' = 'system',
  ): void {
    const line = this.format(level, metadata, message, callerOverride, mode);
    this.output(level, line);
  }

  public raw(data: string): void {
    this.stdoutRaw(data);
  }

  public format(
    level: LoggerNestLevelType,
    metadata: LoggerNestMetadataInterface,
    message: unknown | unknown[],
    callerOverride?: string,
    mode: 'system' | 'application' = 'system',
  ): string {
    const caller = callerOverride ?? metadata.caller;
    const data = Array.isArray(message) ? message : [message];
    const normalizedMetadata = { ...metadata, caller };
    return this.formatLine(level, normalizedMetadata, data, mode);
  }

  protected output(_level: LoggerNestLevelType, line: string): void {
    this.stdoutRaw(line);
  }

  private formatLine(
    level: LoggerNestLevelType,
    metadata: LoggerNestMetadataInterface,
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

  private formatMessage(
    level: LoggerNestLevelType,
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
    level: LoggerNestLevelType,
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

  private print(level: LoggerNestLevelType, trace: LoggerNestMetadataInterface[], args: unknown[]): void {
    this.printLevel(level);
    this.printInfo(level);
    args.forEach((item, index) => {
      if (item instanceof Error) {
        this.printError(item);
      } else {
        this.stdoutRaw(this.prettify(item));
        this.stdoutRaw(' ');
      }
      if (index !== args.length - 1) {
        this.stdoutRaw('\n');
      }
    });
    if (level === 'DBG' && this.options.stackDebug) {
      this.printTrace(level, this.getStack(new Error().stack));
    }
    this.printPerformance();
    this.printLink(level, trace[this.traceIndex]?.file ?? 'unknown');
    this.stdoutRaw('\n');
  }

  private printInfo(level: LoggerNestLevelType): void {
    const info = [this.getSystemName(), this.getSystemPid(), this.getSystemDate(), this.getSystemTime()].filter(
      (item) => {
        return item;
      },
    );
    if (info.length) {
      this.stdoutRaw(info.join(this.wrapData(' \u2503 ', [this.getForeground(level)])));
      this.stdoutRaw(' ');
    }
  }

  private printLevel(level: LoggerNestLevelType): void {
    if (!this.options.info) {
      return;
    }
    this.stdoutRaw(this.wrapData(` ${level} `, [this.getBackground(level)]));
    this.stdoutRaw(' ');
  }

  private printTrace(level: LoggerNestLevelType, trace: LoggerNestMetadataInterface[]): void {
    this.stdoutRaw(this.wrapData('{', [EFFECT_MAP.bold, this.color.cyan]));
    trace
      .filter((item) => {
        return !item.file.includes('node_modules/') && !item.file.includes('node:');
      })
      .forEach((item) => {
        this.stdoutRaw('\n');
        if (this.options.info) {
          this.stdoutRaw(this.wrapData(' at ', [EFFECT_MAP.dim, this.getForeground(level)]));
        } else {
          this.stdoutRaw('    ');
        }
        this.stdoutRaw(this.excludePath(item.file));
      });
    this.stdoutRaw(`\n${this.wrapData('}', [EFFECT_MAP.bold, this.color.cyan])} `);
  }

  private printPerformance(): void {
    if (!this.options.performance) {
      return;
    }
    const elapsed = Math.floor(performance.now() - this.performanceStart);
    if (this.options.color === false) {
      this.stdoutRaw(`+${elapsed}ms `);
      return;
    }
    this.stdoutRaw(this.wrapData('+', [EFFECT_MAP.dim, this.color.cyan]));
    this.stdoutRaw(this.wrapData(elapsed.toString(), [this.color.cyan]));
    this.stdoutRaw(this.wrapData('ms', [EFFECT_MAP.dim, this.color.cyan]));
    this.stdoutRaw(' ');
  }

  private printLink(level: LoggerNestLevelType, link: string): void {
    if (!this.options.link) {
      return;
    }
    this.stdoutRaw('\n');
    if (this.options.info) {
      this.stdoutRaw(this.wrapData(' at ', [this.getBackground(level)]));
      this.stdoutRaw(' ');
    }
    this.stdoutRaw(this.excludePath(link));
  }

  private printError(error: Error): void {
    if (this.options.color === false) {
      this.stdoutRaw(`${error.name}: ${error.message} `);
      if (this.options.stackError && error.stack) {
        this.stdoutRaw(error.stack);
      }
      return;
    }
    this.stdoutRaw(this.wrapData(error.name, [EFFECT_MAP.bold, this.color.red]));
    this.stdoutRaw(this.wrapData(': ', [EFFECT_MAP.dim, this.color.red]));
    if (error.message) {
      this.stdoutRaw(error.message);
      this.stdoutRaw(' ');
    }
    if (this.options.stackError && error.stack) {
      this.printTrace('ERR', this.getStack(error.stack));
    }
  }

  private getSystemName(): string | void {
    if (!this.options.name) {
      return;
    }
    return this.options.name;
  }

  private getSystemPid(): string | void {
    if (!this.options.pid) {
      return;
    }
    return this.wrapData(process.pid.toString(), [this.color.cyan]);
  }

  private getSystemDate(): string | void {
    if (!this.options.date) {
      return;
    }
    const date = new Date();
    if (this.options.color === false) {
      return [
        `${date.getFullYear()}`.padStart(2, '0'),
        '-',
        `${date.getMonth() + 1}`.padStart(2, '0'),
        '-',
        `${date.getDate()}`.padStart(2, '0'),
      ].join('');
    }
    return [
      this.wrapData(`${date.getFullYear()}`.padStart(2, '0'), [this.color.magenta]),
      this.wrapData('-', [this.color.cyan]),
      this.wrapData(`${date.getMonth() + 1}`.padStart(2, '0'), [this.color.magenta]),
      this.wrapData('-', [this.color.cyan]),
      this.wrapData(`${date.getDate()}`.padStart(2, '0'), [this.color.magenta]),
    ].join('');
  }

  private getSystemTime(): string | void {
    if (!this.options.time) {
      return;
    }
    const date = new Date();
    if (this.options.color === false) {
      return [
        `${date.getHours()}`.padStart(2, '0'),
        ':',
        `${date.getMinutes()}`.padStart(2, '0'),
        ':',
        `${date.getSeconds()}`.padStart(2, '0'),
        '.',
        `${date.getMilliseconds()}`.padStart(2, '0'),
      ].join('');
    }
    return [
      this.wrapData(`${date.getHours()}`.padStart(2, '0'), [this.color.cyan]),
      this.wrapData(':', [this.color.magenta]),
      this.wrapData(`${date.getMinutes()}`.padStart(2, '0'), [this.color.cyan]),
      this.wrapData(':', [this.color.magenta]),
      this.wrapData(`${date.getSeconds()}`.padStart(2, '0'), [this.color.cyan]),
      this.wrapData('.', [this.color.magenta]),
      this.wrapData(`${date.getMilliseconds()}`.padStart(2, '0'), [EFFECT_MAP.dim, this.color.cyan]),
    ].join('');
  }

  private getStack(stack?: string): LoggerNestMetadataInterface[] {
    return this.stackToTrace(stack).map((item) => {
      return {
        caller: item.caller,
        method: item.method,
        file: this.excludePath(item.file),
      };
    });
  }

  private getBackground(level: LoggerNestLevelType): string {
    switch (level) {
      case 'LOG':
        return this.background.green;
      case 'INF':
        return this.background.blue;
      case 'WRN':
        return this.background.yellow;
      case 'ERR':
        return this.background.red;
      case 'DBG':
        return this.background.white;
      default:
        return this.background.magenta;
    }
  }

  private getForeground(level: LoggerNestLevelType): string {
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
        return this.color.white;
      default:
        return this.color.magenta;
    }
  }

  private stdoutRaw(data: string): void {
    try {
      process.stdout.write(data);
    } catch (error) {
      const err = error as Error;
      console.error('\n', this.constructor.name);
      console.error('Name:', err.name);
      console.error('Message:', err.message);
      console.error('Data:', data, '\n');
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
