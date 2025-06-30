import { ColorHelper } from '../helpers/color.helper';
import { ParserHelper, ParserTraceInterface } from '../helpers/parser.helper';
import { ConsoleLevelEnum, ConsoleOptionsInterface, ConsoleSystemClass } from './console-system.class';
import { ErrorClass } from './error.class';

const { foreground, effect } = ColorHelper;

export class ConsoleNestClass {
  private readonly consoleClass: ConsoleSystemClass;

  public constructor(private readonly options: ConsoleOptionsInterface) {
    this.consoleClass = new ConsoleSystemClass(options);
  }

  public output(
    level: ConsoleLevelEnum,
    metadata: ParserTraceInterface,
    message: unknown | unknown[],
    // contextOrCaller: string,
    // method?: string,
    // file?: string,
  ): void {
    const info = [
      this.consoleClass.getName(),
      this.consoleClass.getPid(),
      this.consoleClass.getDate(),
      this.consoleClass.getTime(),
    ].filter((item) => {
      return item;
    });
    if (info.length) {
      this.consoleClass.processStdout(info.join(this.consoleClass.colorWrapper(' | ', [effect.BOLD, foreground.CYAN])));
      this.consoleClass.processStdout(' ');
    }
    this.printLevel(level);
    this.printContextOrCaller(level, metadata.caller, metadata.method);
    if (Array.isArray(message)) {
      message.forEach((item) => {
        this.printMessage(level, item);
      });
    } else {
      this.printMessage(level, message);
    }
    this.consoleClass.printPerformance();
    if (level === ConsoleLevelEnum.DBG) {
      this.consoleClass.printTrace(level, ParserHelper.parseStack(new Error().stack));
    }
    this.consoleClass.processStdout('\n');
    this.printLink(level, metadata.file, !info.length);
  }

  private printLevel(level: ConsoleLevelEnum): void {
    if (!this.options.info) {
      return;
    }
    const formattedLevel = this.consoleClass.colorWrapper(this.getFormattedLevel(level), [
      effect.BOLD,
      this.consoleClass.getForeground(level),
    ]);
    this.consoleClass.processStdout(formattedLevel);
    this.consoleClass.processStdout(' ');
  }

  private getFormattedLevel(level: ConsoleLevelEnum): string {
    switch (level) {
      case ConsoleLevelEnum.LOG:
        return '  LOG';
      case ConsoleLevelEnum.ERR:
        return 'ERROR';
      case ConsoleLevelEnum.WRN:
        return ' WARN';
      case ConsoleLevelEnum.DBG:
        return 'DEBUG';
      case ConsoleLevelEnum.INF:
        return ' INFO';
      default:
        return 'FATAL';
    }
  }

  private printContextOrCaller(
    level: ConsoleLevelEnum,
    contextOrCaller: string | undefined,
    method: string | undefined,
  ): void {
    if (contextOrCaller) {
      this.consoleClass.processStdout(
        this.consoleClass.colorWrapper(`[`, [effect.BOLD, this.consoleClass.getForeground(level)]),
      );
      this.consoleClass.processStdout(contextOrCaller);
      if (method) {
        this.consoleClass.processStdout(
          this.consoleClass.colorWrapper(`/`, [effect.BOLD, this.consoleClass.getForeground(level)]),
        );
        this.consoleClass.processStdout(this.consoleClass.colorWrapper(method, foreground.CYAN));
      }
      this.consoleClass.processStdout(
        this.consoleClass.colorWrapper(`]`, [effect.BOLD, this.consoleClass.getForeground(level)]),
      );
    } else {
      this.consoleClass.processStdout(
        this.consoleClass.colorWrapper(`[\u25A0]`, this.consoleClass.getForeground(level)),
      );
    }
    this.consoleClass.processStdout(' ');
  }

  private printMessage(level: ConsoleLevelEnum, message: unknown): void {
    if (typeof message === 'string') {
      if (message.startsWith('Mapped')) {
        this.consoleClass.processStdout(
          this.consoleClass.colorWrapper('Mapped', [effect.DIM, this.consoleClass.getForeground(level)]),
        );
        this.consoleClass.processStdout(
          this.consoleClass.colorWrapper(message.replace('Mapped', ''), foreground.WHITE),
        );
      } else if (message.includes('dependencies')) {
        this.consoleClass.processStdout(
          this.consoleClass.colorWrapper(
            message.replace(
              'dependencies',
              this.consoleClass.colorWrapper('dependencies', [effect.DIM, foreground.WHITE]),
            ),
            this.consoleClass.getForeground(level),
          ),
        );
      } else {
        this.consoleClass.processStdout(
          this.consoleClass.colorWrapper(message, this.consoleClass.getForeground(level)),
        );
      }
    } else if (message instanceof Error) {
      this.consoleClass.printError(message);
    } else if (message instanceof ErrorClass) {
      // this.consoleClass.printError(message);
    } else {
      this.consoleClass.processStdout(this.consoleClass.dataWrapper(message));
    }
    this.consoleClass.processStdout(' ');
  }

  private printLink(level: ConsoleLevelEnum, file: string | undefined, indent: boolean): void {
    if (!this.options.info) {
      return;
    }
    if (file) {
      if (this.options.info) {
        this.consoleClass.processStdout(
          this.consoleClass.colorWrapper(indent ? '   at ' : 'at ', [
            effect.BOLD,
            this.consoleClass.getForeground(level),
          ]),
        );
      }
      this.consoleClass.processStdout(ParserHelper.excludePath(process.cwd(), file));
      // this.consoleClass.processStdout(file);
      this.consoleClass.processStdout('\n');
    }
  }
}
