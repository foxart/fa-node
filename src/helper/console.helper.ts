import * as util from 'util';
import * as process from 'process';
import { ColorHelperEnum, ConsoleColorHelper as cch } from './console-color.helper';
import { ParserHelper } from './parser.helper';

enum LevelEnum {
  LOG,
  INFO,
  WARN,
  ERROR,
  DEBUG,
}

interface OptionsInterface {
  info?: boolean;
  date?: boolean;
  context?: string;
  link?: boolean;
  stack?: boolean;
  index?: number;
  color?: boolean;
  hidden?: boolean;
}

export class ConsoleHelper {
  public readonly console: Console;
  private readonly options: OptionsInterface;

  public constructor(options?: OptionsInterface) {
    this.options = {
      info: options?.info ?? true,
      date: options?.date ?? true,
      context: options?.context,
      link: options?.link ?? true,
      stack: options?.stack ?? true,
      index: options?.index ?? 1,
      color: options?.color ?? true,
      hidden: options?.hidden ?? false,
    };
    this.console = Object.assign({}, console);
  }

  public log(...data: unknown[]): void {
    try {
      const stack = ParserHelper.stack(new Error().stack, { index: this.options.index, short: true });
      this.print(LevelEnum.LOG, stack, data);
    } catch (e) {
      this.console.error(e);
    }
  }

  public info(...data: unknown[]): void {
    try {
      const stack = ParserHelper.stack(new Error().stack, { index: this.options.index, short: true });
      this.print(LevelEnum.INFO, stack, data);
    } catch (e) {
      this.console.error(e);
    }
  }

  public warn(...data: unknown[]): void {
    try {
      const stack = ParserHelper.stack(new Error().stack, { index: this.options.index, short: true });
      this.print(LevelEnum.WARN, stack, data);
    } catch (e) {
      this.console.error(e);
    }
  }

  public error(...data: unknown[]): void {
    try {
      const stack = ParserHelper.stack(new Error().stack, { index: this.options.index, short: true });
      this.print(LevelEnum.ERROR, stack, data);
    } catch (e) {
      this.console.error(e);
    }
  }

  public debug(...data: unknown[]): void {
    try {
      const [, ...stack] = ParserHelper.stack(new Error().stack, { short: true });
      this.print(LevelEnum.DEBUG, stack, data);
    } catch (e) {
      this.console.error(e);
    }
  }

  public stdout(data: string): void {
    process.stdout.write(cch.effect.reset);
    process.stdout.write(data);
  }

  public inspect(data: unknown): string {
    return typeof data === 'string'
      ? data
      : util.inspect(data, {
          showHidden: this.options.hidden,
          depth: null,
          colors: this.options.color,
        });
  }

  private print(level: LevelEnum, stack: string[], args: unknown[]): void {
    if (level === LevelEnum.DEBUG) {
      this.stdoutInfo(level);
      this.stdoutContext(level);
      this.stdoutDate(level);
      this.stdoutArgs(args);
      if (this.options.stack) {
        this.stdout('\n');
        this.stdout(this.colorize('stack', cch.foreground.white));
        this.stdout(' ');
      }
      this.stdoutStack(stack);
      this.stdoutLink(level, stack[0]);
    } else {
      this.stdoutInfo(level);
      this.stdoutContext(level);
      this.stdoutDate(level);
      this.stdoutArgs(args);
      this.stdoutLink(level, stack[0]);
    }
    this.stdout('\n');
  }

  private stdoutContext(level: LevelEnum): void {
    if (this.options.context) {
      this.stdout(this.colorize('[', this.foregroundFromLevel(level)));
      this.stdout(this.options.context);
      this.stdout(this.colorize(']', this.foregroundFromLevel(level)));
      this.stdout(' ');
    }
  }

  private stdoutInfo(level: LevelEnum): void {
    if (this.options.info) {
      const info = Object.keys(LevelEnum as object)[Object.values(LevelEnum as object).indexOf(level)];
      this.stdout(this.colorize([' ', info, ' '], this.backgroundFromLevel(level)));
      this.stdout(' ');
    }
  }

  private stdoutDate(level: LevelEnum): void {
    if (this.options.date) {
      this.stdout(this.colorize(this.date(), [cch.effect.dim, this.foregroundFromLevel(level)]));
      this.stdout(' ');
    }
  }

  private stdoutArgs(args: unknown[]): void {
    args.forEach((item) => {
      if (item instanceof Error) {
        this.stdout(this.colorize(item.name, cch.effect.bright));
        this.stdout(this.colorize(': ', cch.effect.dim));
        this.stdout(this.colorize(item.message, [cch.effect.bright, cch.foreground.red]));
        this.stdout(' ');
        this.stdoutStack(ParserHelper.stack(item.stack, { short: true }));
      } else {
        this.stdout(this.inspect(item));
        this.stdout(' ');
      }
    });
  }

  private stdoutLink(level: LevelEnum, link: string): void {
    if (this.options.link) {
      this.stdout('\n');
      if (this.options.info) {
        this.stdout(this.colorize(' at ', this.backgroundFromLevel(level)));
        this.stdout(' ');
      }
      this.stdout(link);
    }
  }

  private stdoutStack(stack: string[]): void {
    if (this.options.stack) {
      this.stdout('{');
      stack.forEach((item) => {
        this.stdout('\n');
        this.stdout(this.colorize(' at ', cch.foreground.white));
        this.stdout(item);
      });
      this.stdout('\n}');
    }
  }

  private colorize(data: string | string[], colors: ColorHelperEnum | ColorHelperEnum[]): string {
    if (!this.options.color) {
      return Array.isArray(data) ? data.join('') : data;
    }
    const result = (Array.isArray(colors) ? colors : [colors]).reduce(
      (acc, value) => {
        return `${value}${acc}`;
      },
      Array.isArray(data) ? data.join('') : data,
    );
    return `${cch.effect.reset}${result}${cch.effect.reset}`;
  }

  private date(): string {
    // return new Date().toLocaleString('en-GB', {
    //   year: 'numeric',
    //   month: '2-digit',
    //   day: '2-digit',
    //   hour: '2-digit',
    //   minute: '2-digit',
    //   second: '2-digit',
    //   hour12: false,
    // });
    return new Date().toISOString().replace(/T/, ' ').replace(/Z/, '');
  }

  private backgroundFromLevel(level?: LevelEnum): ColorHelperEnum {
    switch (level) {
      case LevelEnum.LOG:
        return cch.background.green;
      case LevelEnum.INFO:
        return cch.background.blue;
      case LevelEnum.WARN:
        return cch.background.yellow;
      case LevelEnum.ERROR:
        return cch.background.red;
      case LevelEnum.DEBUG:
        return cch.background.magenta;
      default:
        return cch.background.gray;
    }
  }

  private foregroundFromLevel(level?: LevelEnum): ColorHelperEnum {
    switch (level) {
      case LevelEnum.LOG:
        return cch.foreground.green;
      case LevelEnum.INFO:
        return cch.foreground.blue;
      case LevelEnum.WARN:
        return cch.foreground.yellow;
      case LevelEnum.ERROR:
        return cch.foreground.red;
      case LevelEnum.DEBUG:
        return cch.foreground.magenta;
      default:
        return cch.foreground.gray;
    }
  }
}
