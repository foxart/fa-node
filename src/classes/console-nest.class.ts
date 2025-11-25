import { ColorHelper } from '../helpers/color.helper';
import { DataHelper } from '../helpers/data.helper';
import { ParserTraceInterface } from '../helpers/parser.helper';
import { ConsoleOptionsInterface, ConsoleSystemClass } from './console-system.class';
import { ErrorClass } from './error.class';

const { foreground, effect } = ColorHelper;

export type ConsoleNestLevelType = 'LOG' | 'INF' | 'WRN' | 'ERR' | 'DBG' | 'FTL';

export class ConsoleNestClass {
  private readonly consoleSystemClass: ConsoleSystemClass;

  public constructor(private readonly options: ConsoleOptionsInterface) {
    this.consoleSystemClass = new ConsoleSystemClass(options);
  }

  public output(
    level: ConsoleNestLevelType,
    metadata: ParserTraceInterface,
    message: unknown | unknown[],
    // contextOrCaller: string,
    // method?: string,
    // file?: string,
  ): void {
    const info = [
      this.consoleSystemClass.getName(),
      this.consoleSystemClass.getPid(),
      this.consoleSystemClass.getDate(),
      this.consoleSystemClass.getTime(),
    ].filter((item) => {
      return item;
    });
    if (info.length) {
      this.consoleSystemClass.processStdout(
        info.join(this.consoleSystemClass.colorWrapper(' | ', [effect.BOLD, foreground.CYAN])),
      );
      this.consoleSystemClass.processStdout(' ');
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
    this.consoleSystemClass.printPerformance();
    if (level === 'DBG') {
      this.consoleSystemClass.printTrace(level, DataHelper.traceListFromErrorStack(new Error().stack));
    }
    this.consoleSystemClass.processStdout('\n');
    this.printLink(level, metadata.file, !info.length);
  }

  private printLevel(level: ConsoleNestLevelType): void {
    if (!this.options.info) {
      return;
    }
    const formattedLevel = this.consoleSystemClass.colorWrapper(this.getFormattedLevel(level), [
      effect.BOLD,
      this.consoleSystemClass.getForeground(level),
    ]);
    this.consoleSystemClass.processStdout(formattedLevel);
    this.consoleSystemClass.processStdout(' ');
  }

  private getFormattedLevel(level: ConsoleNestLevelType): string {
    switch (level) {
      case 'LOG':
        return '  LOG';
      case 'ERR':
        return 'ERROR';
      case 'WRN':
        return ' WARN';
      case 'INF':
        return ' INFO';
      case 'DBG':
        return 'DEBUG';
      default:
        return 'FATAL';
    }
  }

  private printContextOrCaller(
    level: ConsoleNestLevelType,
    contextOrCaller: string | undefined,
    method: string | undefined,
  ): void {
    if (contextOrCaller) {
      this.consoleSystemClass.processStdout(
        this.consoleSystemClass.colorWrapper(`[`, [effect.BOLD, this.consoleSystemClass.getForeground(level)]),
      );
      this.consoleSystemClass.processStdout(contextOrCaller);
      if (method) {
        this.consoleSystemClass.processStdout(
          this.consoleSystemClass.colorWrapper(`/`, [effect.BOLD, this.consoleSystemClass.getForeground(level)]),
        );
        this.consoleSystemClass.processStdout(this.consoleSystemClass.colorWrapper(method, foreground.CYAN));
      }
      this.consoleSystemClass.processStdout(
        this.consoleSystemClass.colorWrapper(`]`, [effect.BOLD, this.consoleSystemClass.getForeground(level)]),
      );
    } else {
      this.consoleSystemClass.processStdout(
        this.consoleSystemClass.colorWrapper(`[\u25A0]`, this.consoleSystemClass.getForeground(level)),
      );
    }
    this.consoleSystemClass.processStdout(' ');
  }

  private printMessage(level: ConsoleNestLevelType, message: unknown): void {
    if (typeof message === 'string') {
      let data: string;
      if (message.includes('dependencies')) {
        data = message.replace(
          'dependencies',
          this.consoleSystemClass.colorWrapper('dependencies', [
            effect.DIM,
            this.consoleSystemClass.getForeground(level),
          ]),
        );
      } else if (message.startsWith('Mapped')) {
        data = message
          .replace(
            'Mapped',
            this.consoleSystemClass.colorWrapper('Mapped', [effect.DIM, this.consoleSystemClass.getForeground(level)]),
          )
          .replace(
            'route',
            this.consoleSystemClass.colorWrapper('route', [effect.DIM, this.consoleSystemClass.getForeground(level)]),
          );
      } else {
        data = message;
      }
      this.consoleSystemClass.processStdout(
        this.consoleSystemClass.colorWrapper(data, this.consoleSystemClass.getForeground(level)),
      );
    } else if (message instanceof Error || message instanceof ErrorClass) {
      this.consoleSystemClass.printError(message);
    } else {
      this.consoleSystemClass.processStdout(this.consoleSystemClass.dataWrapper(message));
    }
    this.consoleSystemClass.processStdout(' ');
  }

  private printLink(level: ConsoleNestLevelType, filePath: string | undefined, indent: boolean): void {
    if (!this.options.info) {
      return;
    }
    if (filePath) {
      if (this.options.info) {
        this.consoleSystemClass.processStdout(
          this.consoleSystemClass.colorWrapper(indent ? '   at ' : 'at ', [
            effect.BOLD,
            this.consoleSystemClass.getForeground(level),
          ]),
        );
      }
      this.consoleSystemClass.processStdout(DataHelper.excludePath(filePath, process.cwd()));
      // this.consoleClass.processStdout(file);
      this.consoleSystemClass.processStdout('\n');
    }
  }
}
