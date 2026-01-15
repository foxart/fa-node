import * as util from 'node:util';
import { ConsoleClass } from './console.class';
import { LoggerNestMetadataInterface } from './logger-nest.class';

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

export class LoggerSystemClass {
  private readonly pid: string;
  private readonly performance: number;
  private readonly traceIndex: number;
  private readonly color: ConsoleClass;

  public constructor(private readonly options: OptionsInterface) {
    this.pid = process.pid.toString();
    this.performance = performance.now();
    this.traceIndex = options.traceIndex ?? 1;
    this.color = this.options.color ? new ConsoleClass(true) : new ConsoleClass(false);
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
      this.stdout(info.join(this.color.wrap(' \u2503 ', [this.getForeground(level)])));
      this.stdout(' ');
    }
  }

  public printLevel(level: LevelType): void {
    if (!this.options.info) {
      return;
    }
    this.stdout(this.color.wrap(` ${level} `, [this.getBackground(level)]));
    this.stdout(' ');
  }

  public printTrace(level: LevelType, trace: TraceInterface[]): void {
    this.stdout(this.color.wrap('{', [this.color.effect.bold, this.color.foreground.cyan]));
    trace
      .filter((item) => {
        return !item.file.includes('node_modules/') && !item.file.includes('node:');
      })
      .forEach((item) => {
        this.stdout('\n');
        if (this.options.info) {
          this.stdout(this.color.wrap(' at ', [this.color.effect.dim, this.getForeground(level)]));
        } else {
          this.stdout('    ');
        }
        this.stdout(this.excludePath(item.file));
      });
    this.stdout(`\n${this.color.wrap('}', [this.color.effect.bold, this.color.foreground.cyan])}`);
    this.stdout(' ');
  }

  public printPerformance(): void {
    if (!this.options.performance) {
      return;
    }
    this.stdout(this.color.wrap('+', [this.color.effect.dim, this.color.foreground.cyan]));
    this.stdout(
      this.color.wrap(Math.floor(performance.now() - this.performance).toString(), [this.color.foreground.cyan]),
    );
    this.stdout(this.color.wrap('ms', [this.color.effect.dim, this.color.foreground.cyan]));
    this.stdout(' ');
  }

  public printLink(level: LevelType, link: string): void {
    if (!this.options.link) {
      return;
    }
    this.stdout('\n');
    if (this.options.info) {
      this.stdout(this.color.wrap(' at ', [this.getBackground(level)]));
      this.stdout(' ');
    }
    this.stdout(this.excludePath(link));
  }

  public printError(error: Error): void {
    this.stdout(this.color.wrap(error.name, [this.color.effect.bold, this.color.foreground.red]));
    this.stdout(this.color.wrap(': ', [this.color.effect.dim, this.color.foreground.red]));
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
    return this.color.wrap(this.pid, [this.color.foreground.cyan]);
  }

  public getDate(): string | void {
    if (!this.options.date) {
      return;
    }
    const date = new Date();
    return [
      this.color.wrap(`${date.getFullYear()}`.padStart(2, '0'), [this.color.foreground.magenta]),
      this.color.wrap('-', [this.color.foreground.cyan]),
      this.color.wrap(`${date.getMonth() + 1}`.padStart(2, '0'), [this.color.foreground.magenta]),
      this.color.wrap('-', [this.color.foreground.cyan]),
      this.color.wrap(`${date.getDate()}`.padStart(2, '0'), [this.color.foreground.magenta]),
    ].join('');
  }

  public getTime(): string | void {
    if (!this.options.time) {
      return;
    }
    const date = new Date();
    return [
      this.color.wrap(`${date.getHours()}`.padStart(2, '0'), [this.color.foreground.cyan]),
      this.color.wrap(':', [this.color.foreground.magenta]),
      this.color.wrap(`${date.getMinutes()}`.padStart(2, '0'), [this.color.foreground.cyan]),
      this.color.wrap(':', [this.color.foreground.magenta]),
      this.color.wrap(`${date.getSeconds()}`.padStart(2, '0'), [this.color.foreground.cyan]),
      this.color.wrap('.', [this.color.foreground.magenta]),
      this.color.wrap(`${date.getMilliseconds()}`.padStart(2, '0'), [
        this.color.effect.dim,
        this.color.foreground.cyan,
      ]),
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
        return this.color.background.green;
      case 'INF':
        return this.color.background.blue;
      case 'WRN':
        return this.color.background.yellow;
      case 'ERR':
        return this.color.background.red;
      case 'DBG':
        return this.color.background.white;
      default:
        return this.color.background.magenta;
    }
  }

  public getForeground(level: LevelType): string {
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
        return this.color.foreground.white;
      default:
        return this.color.foreground.magenta;
    }
  }

  public prettify(data: unknown): string {
    if (typeof data === 'string') {
      return this.color.wrap(data, [this.color.foreground.white]);
    }
    return util.inspect(this.filterCircular(data), {
      colors: this.options.color,
      showHidden: this.options.hidden,
      sorted: this.options.sort,
      depth: null,
    });
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

  private filterCircular(data: unknown): unknown {
    const cache = new WeakSet();
    const walk = (item: unknown): unknown => {
      if (item instanceof Error) {
        return {
          name: item.name,
          message: this.isJsonError(item) ? this.jsonParse(item.message) : item.message,
          stack: this.stackToTrace(item.stack),
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
}
