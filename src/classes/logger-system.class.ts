import * as util from 'node:util';

type LevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG';

interface TraceInterface {
  file: string;
  caller: string;
  method: string | undefined;
}

interface OptionsInterface {
  /** console */
  color?: boolean;
  info?: boolean;
  name?: string;
  pid?: boolean;
  date?: boolean;
  time?: boolean;
  performance?: boolean;
  link?: boolean;
  traceIndex?: number;
  /** trace */
  stackError?: boolean;
  stackDebug?: boolean;
  /** utils */
  sort?: boolean;
  hidden?: boolean;
}

const STACK_REGEXP = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');

const COLOR = {
  foreground: {
    red: '\u001b[31m',
    green: '\u001b[32m',
    blue: '\u001b[34m',
    yellow: '\u001b[33m',
    magenta: '\u001b[35m',
    cyan: '\u001b[36m',
    white: '\u001b[37m',
  },
  background: {
    red: '\u001b[41m',
    green: '\u001b[42m',
    blue: '\u001b[44m',
    yellow: '\u001b[43m',
    magenta: '\u001b[45m',
    cyan: '\u001b[46m',
    white: '\u001b[47m',
  },
  effect: {
    bold: '\u001b[1m',
    dim: '\u001b[2m',
    reset: '\u001b[0m',
  },
};

const NO_COLOR: typeof COLOR = {
  foreground: {
    red: '',
    green: '',
    blue: '',
    yellow: '',
    magenta: '',
    cyan: '',
    white: '',
  },
  background: {
    red: '',
    green: '',
    blue: '',
    yellow: '',
    magenta: '',
    cyan: '',
    white: '',
  },
  effect: {
    bold: '',
    dim: '',
    reset: '',
  },
};

export class LoggerSystemClass {
  // public readonly console: Console;
  private readonly pid: string;
  private readonly performance: number;
  private readonly traceIndex: number;
  private readonly foreground: typeof COLOR.foreground;
  private readonly background: typeof COLOR.background;
  private readonly effect: typeof COLOR.effect;

  public constructor(private readonly options: OptionsInterface) {
    this.pid = process.pid.toString();
    this.performance = performance.now();
    this.traceIndex = options.traceIndex ?? 1;
    const color = options.color === true ? COLOR : NO_COLOR;
    this.foreground = color.foreground;
    this.background = color.background;
    this.effect = color.effect;
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

  public print(level: LevelType, trace: TraceInterface[], args: unknown[]): void {
    this.printLevel(level);
    this.printInfo(level);
    args.forEach((item, index) => {
      if (item instanceof Error) {
        this.printError(item);
      } else {
        this.stdout(this.prettify(item));
        this.stdout(' ');
      }
      if (index !== args.length - 1) {
        process.stdout.write(' ');
        // process.stdout.write('\n');
      }
    });
    if (level === 'DBG' && this.options.stackDebug) {
      this.printTrace(level, this.getStack(new Error().stack));
    }
    this.printPerformance();
    this.printLink(level, trace[this.traceIndex].file);
    this.stdout('\n');
  }

  public printInfo(level: LevelType): void {
    const info = [
      this.getName(),
      this.getPid(),
      this.getDate(),
      this.getTime(),
      //
    ].filter((item) => {
      return item;
    });
    if (info.length) {
      this.stdout(info.join(this.wrapData(' \u2503 ', [this.getForeground(level)])));
      this.stdout(' ');
    }
  }

  public printLevel(level: LevelType): void {
    if (!this.options.info) {
      return;
    }
    this.stdout(this.wrapData(` ${level} `, [this.getBackground(level)]));
    this.stdout(' ');
  }

  public printTrace(level: LevelType, trace: TraceInterface[]): void {
    this.stdout(this.wrapData('{', [this.effect.bold, this.foreground.cyan]));
    trace
      .filter((item) => {
        return !item.file.includes('node_modules/') && !item.file.includes('node:');
      })
      .forEach((item) => {
        this.stdout('\n');
        if (this.options.info) {
          this.stdout(this.wrapData(' at ', [this.effect.dim, this.getForeground(level)]));
        } else {
          this.stdout('    ');
        }
        this.stdout(this.excludePath(item.file, process.cwd()));
      });
    this.stdout(`\n${this.wrapData('}', [this.effect.bold, this.foreground.cyan])}`);
    this.stdout(' ');
  }

  public printPerformance(): void {
    if (!this.options.performance) {
      return;
    }
    this.stdout(this.wrapData('+', [this.effect.dim, this.foreground.cyan]));
    this.stdout(this.wrapData(Math.floor(performance.now() - this.performance).toString(), [this.foreground.cyan]));
    this.stdout(this.wrapData('ms', [this.effect.dim, this.foreground.cyan]));
    this.stdout(' ');
  }

  public printLink(level: LevelType, link: string): void {
    if (!this.options.link) {
      return;
    }
    this.stdout('\n');
    if (this.options.info) {
      this.stdout(this.wrapData(' at ', [this.getBackground(level)]));
      this.stdout(' ');
    }
    this.stdout(this.excludePath(link, process.cwd()));
  }

  public printError(error: Error): void {
    this.stdout(this.wrapData(error.name, [this.effect.bold, this.foreground.red]));
    this.stdout(this.wrapData(': ', [this.effect.dim, this.foreground.red]));
    if (error.message) {
      if (this.isJsonError(error)) {
        this.stdout(this.prettify(this.jsonParse(error.message)));
      } else {
        this.stdout(error.message);
      }
      this.stdout(' ');
    }
    if (this.options.stackError) {
      this.printTrace('ERR', this.getStack(error.stack));
    }
  }

  public getName(): string | void {
    if (!this.options.name) {
      return;
    }
    return this.options.name;
  }

  public getPid(): string | void {
    if (!this.options.pid) {
      return;
    }
    return this.wrapData(this.pid, [this.foreground.cyan]);
  }

  public getDate(): string | void {
    if (!this.options.date) {
      return;
    }
    const date = new Date();
    return [
      this.wrapData(`${date.getFullYear()}`.padStart(2, '0'), [this.foreground.magenta]),
      this.wrapData('-', [this.foreground.cyan]),
      this.wrapData(`${date.getMonth() + 1}`.padStart(2, '0'), [this.foreground.magenta]),
      this.wrapData('-', [this.foreground.cyan]),
      this.wrapData(`${date.getDate()}`.padStart(2, '0'), [this.foreground.magenta]),
    ].join('');
  }

  public getTime(): string | void {
    if (!this.options.time) {
      return;
    }
    const date = new Date();
    return [
      this.wrapData(`${date.getHours()}`.padStart(2, '0'), [this.foreground.cyan]),
      this.wrapData(':', [this.foreground.magenta]),
      this.wrapData(`${date.getMinutes()}`.padStart(2, '0'), [this.foreground.cyan]),
      this.wrapData(':', [this.foreground.magenta]),
      this.wrapData(`${date.getSeconds()}`.padStart(2, '0'), [this.foreground.cyan]),
      this.wrapData('.', [this.foreground.magenta]),
      this.wrapData(`${date.getMilliseconds()}`.padStart(2, '0'), [this.effect.dim, this.foreground.cyan]),
    ].join('');
  }

  public getStack(stack?: string): TraceInterface[] {
    return this.stackToTrace(stack).map((item) => {
      return {
        caller: item.caller,
        method: item.method,
        file: this.excludePath(item.file),
      };
    });
  }

  public getBackground(level: LevelType): string {
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

  public getForeground(level: LevelType): string {
    switch (level) {
      case 'LOG':
        return this.foreground.green;
      case 'INF':
        return this.foreground.blue;
      case 'WRN':
        return this.foreground.yellow;
      case 'ERR':
        return this.foreground.red;
      case 'DBG':
        return this.foreground.white;
      default:
        return this.foreground.magenta;
    }
  }

  public prettify(data: unknown): string {
    if (typeof data === 'string') {
      return this.wrapData(data, [this.foreground.white]);
    }
    return util.inspect(this.filterCircular(data), {
      colors: this.options.color,
      showHidden: this.options.hidden,
      sorted: this.options.sort,
      depth: null,
    });
  }

  public stdout(data: string): void {
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

  private stackToTrace(stack = ''): TraceInterface[] {
    if (!stack) return [];
    const result: TraceInterface[] = [];
    for (const match of stack.matchAll(STACK_REGEXP)) {
      const context = match[1];
      const dotIndex = context.indexOf('.');
      const caller = dotIndex === -1 ? context : context.slice(0, dotIndex);
      const method = dotIndex === -1 ? undefined : context.slice(dotIndex + 1);
      const file = match[2];
      result.push({ caller, method, file });
    }
    return result;
  }

  private excludePath(fromPath: string, excludePath = ''): string {
    const path = excludePath ? excludePath : process.cwd();
    if (!path) return fromPath;
    if (fromPath.startsWith(path)) {
      const rest = fromPath.slice(path.length).replace(/^\/|\/$/g, '');
      return rest || '.';
    }
    return fromPath.replace(/^\/|\/$/g, '');
  }

  private filterCircular(data: unknown): unknown {
    const cache = new WeakSet();
    const walk = (item: unknown): unknown => {
      if (item instanceof Error) {
        const error = item as Error & { messageIsJson?: boolean };
        return {
          name: error.name,
          message: error.messageIsJson ? this.jsonParse(error.message) : error.message,
          stack: this.stackToTrace(error.stack ?? ''),
        };
      }
      if (item === null || typeof item !== 'object') {
        return item;
      }
      if (cache.has(item)) {
        return '[Circular]';
      }
      cache.add(item);
      if (Array.isArray(item)) {
        const arr = new Array(item.length);
        for (let i = 0; i < item.length; i++) {
          arr[i] = walk(item[i]);
        }
        return arr;
      }
      const proto = Object.getPrototypeOf(item) as object;
      if (proto !== Object.prototype && proto !== null) {
        return item;
      }
      const result: Record<string, unknown> = {};
      for (const key in item as Record<string, unknown>) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          result[key] = walk((item as Record<string, unknown>)[key]);
        }
      }
      return result;
    };
    return walk(data);
  }

  private isJsonError(error: Error): boolean {
    return Boolean((error as { messageIsJson?: boolean }).messageIsJson);
  }

  private jsonParse<T>(data: string): T | string {
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      return data;
    }
  }

  private wrapData(data: string, styles: string[]): string {
    return `${styles.join('')}${data}${this.effect.reset}`;
  }
}
