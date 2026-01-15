import * as util from 'node:util';
import { ColorHelper } from '../helpers/color.helper';
import { DataHelper, StackToTraceInterface } from '../helpers/data.helper';
import { ErrorClass } from './error.class';

const { foreground, background, effect } = ColorHelper;

export type LoggerNodeLevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG';

export interface LoggerNodeOptionsInterface {
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

export class LoggerSystemClass {
  // public readonly console: Console;
  private readonly pid: string;
  private readonly performance: number;
  private readonly traceIndex: number;

  public constructor(private readonly options: LoggerNodeOptionsInterface) {
    // this.console = Object.assign({}, console);
    this.pid = process.pid.toString();
    this.performance = performance.now();
    this.traceIndex = options.traceIndex ?? 1;
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

  public print(level: LoggerNodeLevelType, trace: StackToTraceInterface[], args: unknown[]): void {
    this.printLevel(level);
    this.printInfo(level);
    args.forEach((item, index) => {
      if (item instanceof Error || item instanceof ErrorClass) {
        this.printError(item);
      } else {
        this.stdout(this.prettify(item));
        this.stdout(' ');
      }
      if (index !== args.length - 1) {
        // this.processStdout(' ');
        process.stdout.write('\n');
      }
    });
    if (level === 'DBG' && this.options.stackDebug) {
      this.printTrace(level, this.getStack(new Error().stack));
    }
    this.printPerformance();
    this.printLink(level, trace[this.traceIndex].file);
    this.stdout('\n');
  }

  public printInfo(level: LoggerNodeLevelType): void {
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
      // this.stdout(info.join(ColorHelper.wrapData(' \u2503 ', [foreground.RED])));
      this.stdout(info.join(ColorHelper.wrapData(' \u2503 ', [this.getForeground(level)])));
      this.stdout(' ');
    }
  }

  public printLevel(level: LoggerNodeLevelType): void {
    if (!this.options.info) {
      return;
    }
    this.stdout(ColorHelper.wrapData(` ${level} `, [this.getBackground(level)]));
    this.stdout(' ');
  }

  public printTrace(level: LoggerNodeLevelType, trace: StackToTraceInterface[]): void {
    this.stdout(ColorHelper.wrapData('{', [effect.BOLD, foreground.CYAN]));
    trace
      .filter((item) => {
        return !item.file.includes('node_modules/') && !item.file.includes('node:');
      })
      .forEach((item) => {
        this.stdout('\n');
        if (this.options.info) {
          this.stdout(ColorHelper.wrapData(' at ', [effect.DIM, this.getForeground(level)]));
        } else {
          this.stdout('    ');
        }
        this.stdout(DataHelper.excludePath(item.file, process.cwd()));
      });
    this.stdout(`\n${ColorHelper.wrapData('}', [effect.BOLD, foreground.CYAN])}`);
    this.stdout(' ');
  }

  public printPerformance(): void {
    if (!this.options.performance) {
      return;
    }
    this.stdout(ColorHelper.wrapData('+', [effect.DIM, foreground.CYAN]));
    this.stdout(ColorHelper.wrapData(Math.floor(performance.now() - this.performance).toString(), [foreground.CYAN]));
    this.stdout(ColorHelper.wrapData('ms', [effect.DIM, foreground.CYAN]));
    this.stdout(' ');
  }

  public printLink(level: LoggerNodeLevelType, link: string): void {
    if (!this.options.link) {
      return;
    }
    this.stdout('\n');
    if (this.options.info) {
      this.stdout(ColorHelper.wrapData(' at ', [this.getBackground(level)]));
      this.stdout(' ');
    }
    this.stdout(DataHelper.excludePath(link, process.cwd()));
  }

  public printError(error: Error | ErrorClass): void {
    this.stdout(ColorHelper.wrapData(error.name, [effect.BOLD, foreground.RED]));
    this.stdout(ColorHelper.wrapData(': ', [effect.DIM, foreground.RED]));
    if (error.message) {
      if (error instanceof ErrorClass && error.messageIsJson) {
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
    return ColorHelper.wrapData(this.pid, [foreground.CYAN]);
  }

  public getDate(): string | void {
    if (!this.options.date) {
      return;
    }
    const date = new Date();
    return [
      ColorHelper.wrapData(`${date.getFullYear()}`.padStart(2, '0'), [foreground.MAGENTA]),
      ColorHelper.wrapData('-', [foreground.CYAN]),
      ColorHelper.wrapData(`${date.getMonth() + 1}`.padStart(2, '0'), [foreground.MAGENTA]),
      ColorHelper.wrapData('-', [foreground.CYAN]),
      ColorHelper.wrapData(`${date.getDate()}`.padStart(2, '0'), [foreground.MAGENTA]),
    ].join('');
  }

  public getTime(): string | void {
    if (!this.options.time) {
      return;
    }
    const date = new Date();
    return [
      ColorHelper.wrapData(`${date.getHours()}`.padStart(2, '0'), [foreground.CYAN]),
      ColorHelper.wrapData(':', [foreground.MAGENTA]),
      ColorHelper.wrapData(`${date.getMinutes()}`.padStart(2, '0'), [foreground.CYAN]),
      ColorHelper.wrapData(':', [foreground.MAGENTA]),
      ColorHelper.wrapData(`${date.getSeconds()}`.padStart(2, '0'), [foreground.CYAN]),
      ColorHelper.wrapData('.', [foreground.MAGENTA]),
      ColorHelper.wrapData(`${date.getMilliseconds()}`.padStart(2, '0'), [effect.DIM, foreground.CYAN]),
    ].join('');
  }

  public getStack(stack?: string): StackToTraceInterface[] {
    return DataHelper.stackToTrace(stack).map((item) => {
      return {
        caller: item.caller,
        method: item.method,
        file: DataHelper.excludePath(item.file),
      };
    });
  }

  public getBackground(level: LoggerNodeLevelType): string {
    switch (level) {
      case 'LOG':
        return background.GREEN;
      case 'INF':
        return background.BLUE;
      case 'WRN':
        return background.YELLOW;
      case 'ERR':
        return background.RED;
      case 'DBG':
        return background.WHITE;
      default:
        return background.MAGENTA;
    }
  }

  public getForeground(level: LoggerNodeLevelType): string {
    switch (level) {
      case 'LOG':
        return foreground.GREEN;
      case 'INF':
        return foreground.BLUE;
      case 'WRN':
        return foreground.YELLOW;
      case 'ERR':
        return foreground.RED;
      case 'DBG':
        return foreground.WHITE;
      default:
        return foreground.MAGENTA;
    }
  }

  public prettify(data: unknown): string {
    if (typeof data === 'string') {
      return ColorHelper.wrapData(data, [foreground.WHITE]);
    }
    return util.inspect(DataHelper.filterCircular(data), {
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

  private jsonParse<T>(data: string): T | string {
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      return data;
    }
  }
}
