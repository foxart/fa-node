import * as util from 'node:util';
import { ColorHelper } from '../helpers/color.helper';
import { ParserHelper, ParserTraceInterface } from '../helpers/parser.helper';
import { ErrorClass } from './error.class';

const { foreground, background, effect } = ColorHelper;

export enum ConsoleLevelEnum {
  UNK,
  LOG,
  INF,
  WRN,
  ERR,
  DBG,
}

export interface ConsoleOptionsInterface {
  /** console */
  color?: boolean;
  info?: boolean;
  counter?: boolean;
  name?: string;
  date?: boolean;
  performance?: boolean;
  link?: boolean;
  linkIndex?: number;
  /** trace */
  stackFull?: boolean;
  stackErrorShow?: boolean;
  stackDebugShow?: boolean;
  /** utils */
  dataType?: boolean;
  dataSort?: boolean;
}

export class ConsoleClass {
  public readonly console: Console;

  public readonly stackIndex: number;

  private readonly performance: number;

  private counter: number;

  public constructor(private readonly options: ConsoleOptionsInterface) {
    this.counter = 0;
    this.performance = performance.now();
    this.stackIndex = options.linkIndex || 1;
    this.console = Object.assign({}, console);
  }

  public log(...data: unknown[]): void {
    try {
      this.print(ConsoleLevelEnum.LOG, ParserHelper.stack(new Error().stack), data);
    } catch (e) {
      this.console.error(e);
    }
  }

  public info(...data: unknown[]): void {
    try {
      this.print(ConsoleLevelEnum.INF, ParserHelper.stack(new Error().stack), data);
    } catch (e) {
      this.console.error(e);
    }
  }

  public warn(...data: unknown[]): void {
    try {
      this.print(ConsoleLevelEnum.WRN, ParserHelper.stack(new Error().stack), data);
    } catch (e) {
      this.console.error(e);
    }
  }

  public error(...data: unknown[]): void {
    try {
      this.print(ConsoleLevelEnum.ERR, ParserHelper.stack(new Error().stack), data);
    } catch (e) {
      this.console.error(e);
    }
  }

  public debug(...data: unknown[]): void {
    try {
      this.print(ConsoleLevelEnum.DBG, ParserHelper.stack(new Error().stack), data);
    } catch (e) {
      this.console.error(e);
    }
  }

  protected print(level: ConsoleLevelEnum, stack: ParserTraceInterface[], args: unknown[]): void {
    this.printInfo(level);
    this.printCounter();
    this.printName(level);
    this.printDate();
    args.forEach((item) => {
      if (item instanceof Error || item instanceof ErrorClass) {
        this.printError(item);
      } else {
        this.processStdout(this.dataWrapper(item));
        this.processStdout(' ');
      }
    });
    if (level === ConsoleLevelEnum.DBG && this.options.stackDebugShow) {
      this.printTrace(level, ParserHelper.stack(new Error().stack, { full: this.options.stackFull }));
    }
    this.printPerformance();
    this.printLink(level, stack[this.stackIndex].file);
    this.processStdout('\n');
  }

  protected printError(error: Error | ErrorClass): void {
    this.processStdout(this.colorWrapper(error.name, [effect.BOLD, foreground.CYAN]));
    this.processStdout(this.colorWrapper(': ', foreground.RED));
    this.processStdout(this.colorWrapper(error.message, foreground.RED));
    this.processStdout(' ');
    if (error instanceof ErrorClass) {
      if (error.details) {
        this.processStdout(this.dataWrapper(error.details));
        this.processStdout(' ');
      }
    }
    if (this.options.stackErrorShow) {
      this.printTrace(ConsoleLevelEnum.ERR, ParserHelper.stack(error.stack, { full: this.options.stackFull }));
    }
  }

  protected printCounter(): void {
    if (this.options.counter) {
      this.counter++;
      this.processStdout(this.colorWrapper(this.counter.toString(), foreground.CYAN));
      this.processStdout(this.colorWrapper('/', [effect.BOLD, foreground.WHITE]));
    }
  }

  protected printDate(): void {
    if (this.options.date) {
      this.processStdout(
        this.colorWrapper(new Date().toISOString().replace(/T/, ' ').replace(/Z/, ''), [effect.DIM, foreground.CYAN]),
      );
      this.processStdout(' ');
    }
  }

  protected printInfo(level: ConsoleLevelEnum): void {
    if (this.options.info) {
      const info = Object.keys(ConsoleLevelEnum as object)[Object.values(ConsoleLevelEnum as object).indexOf(level)];
      this.processStdout(this.colorWrapper(` ${info} `, this.getBackground(level)));
      this.processStdout(' ');
    }
  }

  protected printLink(level: ConsoleLevelEnum, link: string): void {
    if (this.options.link) {
      this.processStdout('\n');
      if (this.options.info) {
        this.processStdout(this.colorWrapper(' at ', this.getBackground(level)));
        this.processStdout(' ');
      }
      this.processStdout(link);
    }
  }

  protected printName(level: ConsoleLevelEnum): void {
    if (this.options.name) {
      this.processStdout(this.colorWrapper('[', [effect.BOLD, this.getForeground(level)]));
      this.processStdout(this.colorWrapper(this.options.name, [effect.DIM, this.getForeground(level)]));
      this.processStdout(this.colorWrapper(']', [effect.BOLD, this.getForeground(level)]));
      this.processStdout(' ');
    }
  }

  protected printPerformance(): void {
    if (this.options.performance) {
      this.processStdout(this.colorWrapper('+', [effect.DIM, foreground.CYAN]));
      this.processStdout(
        this.colorWrapper(Math.floor(performance.now() - this.performance).toString(), foreground.CYAN),
      );
      this.processStdout(this.colorWrapper('ms', [effect.DIM, foreground.CYAN]));
      this.processStdout(' ');
    }
  }

  protected printTrace(level: ConsoleLevelEnum, trace: ParserTraceInterface[]): void {
    this.processStdout(this.colorWrapper('{', [effect.DIM, this.getForeground(level)]));
    trace
      .filter((item) => {
        return item.file.indexOf('node_modules') === -1;
      })
      .forEach((item) => {
        this.processStdout('\n');
        if (this.options.info) {
          this.processStdout(this.colorWrapper(' at ', [effect.DIM, this.getForeground(level)]));
        } else {
          this.processStdout('    ');
        }
        this.processStdout(item.file);
      });
    this.processStdout(`\n${this.colorWrapper('}', [effect.DIM, this.getForeground(level)])}`);
    this.processStdout(' ');
  }

  protected getBackground(level: ConsoleLevelEnum): string {
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
        return background.MAGENTA;
      default:
        return background.GRAY;
    }
  }

  protected getForeground(level: ConsoleLevelEnum): string {
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
        return foreground.MAGENTA;
      default:
        return foreground.WHITE;
    }
  }

  protected colorWrapper(data: string, colors: string | string[]): string {
    if (!this.options.color) {
      return Array.isArray(data) ? data.join('') : data;
    }
    return ColorHelper.wrapData(data, colors);
  }

  protected dataWrapper(data: unknown): string {
    return util.inspect(data, {
      colors: this.options.color,
      showHidden: this.options.dataType,
      sorted: this.options.dataSort,
      depth: null,
    });
  }

  protected processStdout(data: string): void {
    try {
      process.stdout.write(data);
    } catch (e) {
      this.console.log(data);
      this.console.error(e);
    }
  }
}
