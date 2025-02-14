import { LoggerService } from '@nestjs/common';
import { ConsoleClass, ConsoleLevelEnum } from '../classes/console.class';
import { ErrorClass } from '../classes/error.class';
import { ColorHelper } from '../helpers/color.helper';
import { ParserHelper } from '../helpers/parser.helper';

const { foreground, effect } = ColorHelper;

class NestConsoleClass extends ConsoleClass {
  public constructor() {
    super({
      color: true,
      counter: true,
      performance: true,
      dataColor: true,
      // dataSort: true,
    });
  }

  public override print(level: ConsoleLevelEnum, trace: string[], args: unknown[]): void {
    const [message, context, ...data] = args;
    this.printCounter();
    this.printName(level);
    this.printDate();
    this.processStdout(ColorHelper.wrapData(context as string, [this.getForeground(level)]));
    this.processStdout(' ');
    this.processStdout(message as string);
    this.processStdout(' ');
    data.forEach((item) => {
      if (item instanceof Error) {
        this.processStdout(this.colorWrapper(item.name, [effect.BOLD, foreground.CYAN]));
        this.processStdout(this.colorWrapper(': ', foreground.RED));
        if (item instanceof ErrorClass) {
          this.processStdout(item.message);
          if (item.details) {
            this.processStdout(' ');
            this.processStdout(this.dataWrapper(item.details));
          }
        } else {
          this.processStdout(item.message);
        }
        this.processStdout(' ');
      } else {
        this.processStdout(this.dataWrapper(item));
        this.processStdout(' ');
      }
    });
    if (trace.length) {
      this.processStdout(this.colorWrapper('{', [effect.DIM, this.getForeground(level)]));
      trace.forEach((item) => {
        this.processStdout('\n');
        this.processStdout(this.colorWrapper(' at ', [effect.DIM, this.getForeground(level)]));
        this.processStdout(item);
      });
      this.processStdout(`\n${this.colorWrapper('}', [effect.DIM, this.getForeground(level)])}`);
      this.processStdout(' ');
    }
    this.printPerformance();
    this.processStdout('\n');
  }
}

const nextConsole = new NestConsoleClass();

export class NestLoggerService implements LoggerService {
  public readonly console: NestConsoleClass;

  public constructor() {
    this.console = nextConsole;
  }

  public log(message: string, context: string, ...args: unknown[]): void {
    this.console.print(ConsoleLevelEnum.LOG, [], [message, context, ...args]);
  }

  public error(message: string, stack: string, context: string, ...args: unknown[]): void {
    this.console.print(
      ConsoleLevelEnum.ERR,
      ParserHelper.stack(stack).filter((item) => item.indexOf('node_modules') === -1),
      [message, context, ...args],
    );
  }

  public warn(message: string, context: string, ...args: unknown[]): void {
    this.console.print(ConsoleLevelEnum.WRN, [], [message, context, ...args]);
  }
}
