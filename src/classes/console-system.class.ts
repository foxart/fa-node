import * as process from 'node:process';
import * as util from 'node:util';
import { ColorHelper } from '../helpers/color.helper';
import { DataHelper } from '../helpers/data.helper';
import { ParserHelper, ParserTraceInterface } from '../helpers/parser.helper';
import { ErrorClass } from './error.class';

const { foreground, background, effect } = ColorHelper;

export enum ConsoleLevelEnum {
  LOG = 'LOG',
  INF = 'INFO',
  WRN = 'WARNING',
  ERR = 'ERROR',
  DBG = 'DEBUG',
  CST = 'CUSTOM',
}

export interface ConsoleOptionsInterface {
  /** console */
  color?: boolean;
  info?: boolean;
  name?: string;
  pid?: boolean;
  date?: boolean;
  time?: boolean;
  performance?: boolean;
  link?: boolean;
  linkIndex?: number;
  /** trace */
  stackError?: boolean;
  stackDebug?: boolean;
  /** utils */
  sort?: boolean;
  hidden?: boolean;
}

export class ConsoleSystemClass {
  public readonly console: Console;

  private readonly pid: string;

  private readonly performance: number;

  public constructor(private readonly options: ConsoleOptionsInterface) {
    this.console = Object.assign({}, console);
    this.pid = process.pid.toString();
    this.performance = performance.now();
  }

  public log(...data: unknown[]): void {
    this.print(ConsoleLevelEnum.LOG, this.getStack(new Error().stack), data);
  }

  public info(...data: unknown[]): void {
    this.print(ConsoleLevelEnum.INF, this.getStack(new Error().stack), data);
  }

  public warn(...data: unknown[]): void {
    this.print(ConsoleLevelEnum.WRN, this.getStack(new Error().stack), data);
  }

  public error(...data: unknown[]): void {
    this.print(ConsoleLevelEnum.ERR, this.getStack(new Error().stack), data);
  }

  public debug(...data: unknown[]): void {
    this.print(ConsoleLevelEnum.DBG, this.getStack(new Error().stack), data);
  }

  public custom(...data: unknown[]): void {
    this.print(ConsoleLevelEnum.CST, this.getStack(new Error().stack), data);
  }

  public print(level: ConsoleLevelEnum, trace: ParserTraceInterface[], args: unknown[]): void {
    this.printLevel(level);
    this.printInfo();
    args.forEach((item) => {
      if (item instanceof Error || item instanceof ErrorClass) {
        this.printError(item);
      } else {
        this.processStdout(this.dataWrapper(item));
        this.processStdout(' ');
      }
    });
    if (level === ConsoleLevelEnum.DBG && this.options.stackDebug) {
      this.printTrace(level, this.getStack(new Error().stack));
    }
    this.printPerformance();
    this.printLink(level, trace[this.options.linkIndex ?? 1].file);
    this.processStdout('\n');
  }

  public printInfo(): void {
    const info = [this.getName(), this.getPid(), this.getDate(), this.getTime()].filter((item) => {
      return item;
    });
    if (info.length) {
      this.processStdout(info.join(this.colorWrapper(' | ', [effect.BOLD, foreground.CYAN])));
      this.processStdout(' ');
    }
  }

  public printLevel(level: ConsoleLevelEnum): void {
    if (this.options.info) {
      const info = Object.keys(ConsoleLevelEnum as object)[Object.values(ConsoleLevelEnum as object).indexOf(level)];
      this.processStdout(this.colorWrapper(` ${info} `, this.getBackground(level)));
      this.processStdout(' ');
    }
  }

  public printTrace(level: ConsoleLevelEnum, trace: ParserTraceInterface[]): void {
    this.processStdout(this.colorWrapper('{', [effect.BOLD, foreground.CYAN]));
    trace
      .filter((item) => {
        return !item.file.includes('node_modules/') && !item.file.includes('node:');
      })
      .forEach((item) => {
        this.processStdout('\n');
        if (this.options.info) {
          this.processStdout(this.colorWrapper(' at ', [effect.DIM, this.getForeground(level)]));
        } else {
          this.processStdout('    ');
        }
        this.processStdout(DataHelper.excludePath(item.file, process.cwd()));
      });
    this.processStdout(`\n${this.colorWrapper('}', [effect.BOLD, foreground.CYAN])}`);
    this.processStdout(' ');
  }

  public printPerformance(): void {
    if (this.options.performance) {
      this.processStdout(this.colorWrapper('+', [effect.DIM, foreground.CYAN]));
      this.processStdout(
        this.colorWrapper(Math.floor(performance.now() - this.performance).toString(), foreground.CYAN),
      );
      this.processStdout(this.colorWrapper('ms', [effect.DIM, foreground.CYAN]));
      this.processStdout(' ');
    }
  }

  public printLink(level: ConsoleLevelEnum, link: string): void {
    if (this.options.link) {
      this.processStdout('\n');
      if (this.options.info) {
        this.processStdout(this.colorWrapper(' at ', this.getBackground(level)));
        this.processStdout(' ');
      }
      this.processStdout(DataHelper.excludePath(link, process.cwd()));
    }
  }

  public printError(error: Error | ErrorClass): void {
    this.processStdout(this.colorWrapper(error.name, [effect.BOLD, foreground.RED]));
    this.processStdout(this.colorWrapper(': ', [effect.DIM, foreground.RED]));
    if (error instanceof ErrorClass && error.messageIsJson) {
      this.processStdout(this.dataWrapper(DataHelper.fromJson(error.message)));
    } else {
      this.processStdout(error.message);
    }
    this.processStdout(' ');
    if (this.options.stackError) {
      this.printTrace(ConsoleLevelEnum.ERR, this.getStack(error.stack));
    }
  }

  public getName(): string | void {
    if (!this.options.name) {
      return;
    }
    return this.colorWrapper(this.options.name, foreground.WHITE);
  }

  public getPid(): string | void {
    if (!this.options.pid) {
      return;
    }
    return this.colorWrapper(this.pid, [effect.DIM, foreground.YELLOW]);
  }

  public getDate(): string | void {
    if (!this.options.date) {
      return;
    }
    const ISO_DATE_INDEX = 0; // Index to extract date from ISO string
    const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
    const formatDateString = (year: string, month: string, day: string): string => {
      return [day, month, year.slice(-2)]
        .map((unit) => {
          return this.colorWrapper(unit, [effect.DIM, foreground.GREEN]);
        })
        .join(this.colorWrapper('/', [effect.DIM]));
    };
    const isoDate = new Date().toISOString().split('T')[ISO_DATE_INDEX]; // Extract ISO date part
    return isoDate.replace(DATE_REGEX, formatDateString);
  }

  public getTime(): string | void {
    if (!this.options.time) {
      return;
    }
    const ISO_TIME_INDEX = 1; // Index to extract time from ISO string
    const TIME_REGEX = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;
    const formatHMS = (hour: string, minute: string, second: string): string => {
      return [hour, minute, second]
        .map((unit) => this.colorWrapper(unit, foreground.GREEN))
        .join(this.colorWrapper(':', effect.DIM));
    };
    const formatMilliseconds = (ms: string): string => {
      return `${this.colorWrapper('.', effect.DIM)}${this.colorWrapper(ms, [effect.DIM, foreground.GREEN])}`;
    };
    const formatTime = (_: string, hour: string, minute: string, second: string, ms: string): string => {
      const hms = formatHMS(hour, minute, second);
      const millis = formatMilliseconds(ms);
      return `${hms}${millis}`;
    };
    const isoTime = new Date().toISOString().split('T')[ISO_TIME_INDEX]; // Extract ISO time part
    return isoTime.replace(TIME_REGEX, formatTime);
  }

  public getStack(stack?: string): ParserTraceInterface[] {
    return ParserHelper.parseStack(stack).map((item) => {
      return {
        caller: item.caller,
        method: item.method,
        file: DataHelper.excludePath(item.file, process.cwd()),
      };
    });
  }

  public getBackground(level: ConsoleLevelEnum): string {
    switch (level) {
      case ConsoleLevelEnum.LOG:
        return background.GREEN;
      case ConsoleLevelEnum.INF:
        return background.BLUE;
      case ConsoleLevelEnum.WRN:
        return background.YELLOW;
      case ConsoleLevelEnum.ERR:
        return background.RED;
      case ConsoleLevelEnum.DBG:
        return background.WHITE;
      default:
        return background.MAGENTA;
    }
  }

  public getForeground(level: ConsoleLevelEnum): string {
    switch (level) {
      case ConsoleLevelEnum.LOG:
        return foreground.GREEN;
      case ConsoleLevelEnum.INF:
        return foreground.BLUE;
      case ConsoleLevelEnum.WRN:
        return foreground.YELLOW;
      case ConsoleLevelEnum.ERR:
        return foreground.RED;
      case ConsoleLevelEnum.DBG:
        return foreground.WHITE;
      default:
        return foreground.MAGENTA;
    }
  }

  public colorWrapper(data: string, colors: string | string[]): string {
    if (!this.options.color) {
      return Array.isArray(data) ? data.join('') : data;
    }
    return ColorHelper.wrapData(data, colors);
  }

  public dataWrapper(data: unknown): string {
    return util.inspect(DataHelper.safeCircular(data, process.cwd()), {
      colors: this.options.color,
      showHidden: this.options.hidden,
      sorted: this.options.sort,
      depth: null,
    });
  }

  public processStdout(data: string): void {
    try {
      process.stdout.write(data);
    } catch (e) {
      const error = e as Error;
      this.console.error('\n', this.constructor.name);
      this.console.error('Name:', error.name);
      this.console.error('Message:', error.message);
      this.console.error('Data:', data, '\n');
    }
  }
}

const consoleLog = console.log.bind(console);
const consoleWarn = console.warn.bind(console);
const consoleInfo = console.info.bind(console);
const consoleError = console.error.bind(console);
const consoleDebug = console.debug.bind(console);

export class ConsoleClass {
  private readonly consoleClass: ConsoleSystemClass;

  private readonly console: Console;

  public constructor(options: ConsoleOptionsInterface) {
    this.console = console;
    this.consoleClass = new ConsoleSystemClass(options);
  }

  public override(): void {
    console.log = this.consoleClass.log.bind(this.consoleClass);
    console.info = this.consoleClass.info.bind(this.consoleClass);
    console.warn = this.consoleClass.warn.bind(this.consoleClass);
    console.error = this.consoleClass.error.bind(this.consoleClass);
    console.debug = this.consoleClass.debug.bind(this.consoleClass);
  }

  public restore(): void {
    console.log = consoleLog;
    console.info = consoleInfo;
    console.warn = consoleWarn;
    console.error = consoleError;
    console.debug = consoleDebug;
  }
}
